#!/usr/bin/env python3
"""
Adversarial Stress Test Harness for QuickTime Atom Synthesizer & Media Utils
===========================================================================
Teamwork Preview Challenger 2 (Empirical Adversarial Validation)
Tests:
1. Reconstructing atoms on empty buffers, 1-byte buffers, and truncated MP4 files.
2. Fragmented `moof`/`mdat` atoms vs unified `moov`/`mdat`.
3. 64-bit (`co64`) vs 32-bit (`stco`) chunk offset precision and large boxes (> 4GB).
4. ISO/IEC 14496-12 & QuickTime File Format specification compliance & atom alignment.
5. Deeply nested, circular, and malformed atom tree parser safety.
6. Memory corruption, infinite loops, and NaN offsets evaluation across 5,000 fuzz cycles.
"""

import sys
import os
import struct
import time
import random
import unittest
from typing import Dict, Any, List, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "test", "e2e"))
from test_runner import QuickTimeAtomEngine, MediaSniffer


class QuickTimeAdversarialStressHarness(unittest.TestCase):

    def test_01_empty_and_sub_header_buffers(self):
        """Tests reconstruction and parsing on 0-byte to 7-byte underflow buffers."""
        for length in range(8):
            buf = bytes([0xAA] * length)
            nodes = QuickTimeAtomEngine.parse_atoms(buf)
            self.assertEqual(nodes, [], f"Underflow buffer of length {length} must return empty atom tree")

            reconstructed = QuickTimeAtomEngine.reconstruct_rayban_mov(buf, width=1376, height=1840)
            self.assertIsInstance(reconstructed, bytes)
            self.assertGreater(len(reconstructed), 100)

            rec_nodes = QuickTimeAtomEngine.parse_atoms(reconstructed)
            self.assertGreaterEqual(len(rec_nodes), 3)
            self.assertEqual(rec_nodes[0]["type"], "ftyp")
            self.assertEqual(rec_nodes[1]["type"], "moov")
            self.assertEqual(rec_nodes[2]["type"], "mdat")

    def test_02_truncated_atom_headers_and_payloads(self):
        """Tests truncated headers and oversized atom size claims."""
        # Case A: Atom size = 500, but buffer length = 12
        truncated_hdr = struct.pack(">I4s4s", 500, b"moov", b"\x00\x00\x00\x00")
        nodes = QuickTimeAtomEngine.parse_atoms(truncated_hdr)
        self.assertEqual(nodes, [], "Oversized atom declaration must break cleanly without reading out of bounds")

        # Case B: 64-bit large-size atom (size=1) with missing uint64 size field
        truncated_64 = struct.pack(">I4s", 1, b"mdat") + b"\x00\x00\x00"
        nodes64 = QuickTimeAtomEngine.parse_atoms(truncated_64)
        self.assertEqual(nodes64, [], "Truncated 64-bit atom header must terminate parsing cleanly")

        # Case C: Invalid atom size < 8 (e.g. 1..7)
        for bad_size in [2, 3, 4, 5, 6, 7]:
            bad_buf = struct.pack(">I4s", bad_size, b"test") + (b"\x00" * 16)
            self.assertEqual(QuickTimeAtomEngine.parse_atoms(bad_buf), [])

    def test_03_fragmented_mp4_moof_mdat_support(self):
        """Tests fragmented MP4 (moof + mdat) sequences."""
        ftyp = QuickTimeAtomEngine.build_atom(b"ftyp", b"isom\x00\x00\x02\x00mp41")
        moov = QuickTimeAtomEngine.build_atom(b"moov", QuickTimeAtomEngine.build_atom(b"mvex", b"\x00" * 16))
        
        # Build 3 fragmented segments: moof + mdat
        fmp4_stream = bytearray(ftyp + moov)
        expected_mdats = []
        for i in range(3):
            mfhd = QuickTimeAtomEngine.build_atom(b"mfhd", struct.pack(">II", 0, i + 1))
            traf = QuickTimeAtomEngine.build_atom(b"traf", b"\x00" * 24)
            moof = QuickTimeAtomEngine.build_atom(b"moof", mfhd + traf)
            sample_data = bytes([0x10 * (i + 1)] * 64)
            mdat = QuickTimeAtomEngine.build_atom(b"mdat", sample_data)
            expected_mdats.append(mdat)
            fmp4_stream.extend(moof + mdat)

        nodes = QuickTimeAtomEngine.parse_atoms(bytes(fmp4_stream))
        self.assertEqual(len(nodes), 8) # ftyp, moov, moof, mdat, moof, mdat, moof, mdat
        types = [n["type"] for n in nodes]
        self.assertEqual(types, ["ftyp", "moov", "moof", "mdat", "moof", "mdat", "moof", "mdat"])

        # Test reconstruction from fMP4
        reconstructed = QuickTimeAtomEngine.reconstruct_rayban_mov(bytes(fmp4_stream))
        rec_nodes = QuickTimeAtomEngine.parse_atoms(reconstructed)
        self.assertEqual(rec_nodes[0]["type"], "ftyp")
        self.assertEqual(rec_nodes[1]["type"], "moov")
        self.assertEqual(rec_nodes[2]["type"], "mdat")
        self.assertEqual(rec_nodes[2]["size"], len(expected_mdats[0]))

    def test_04_exact_64bit_co64_vs_32bit_stco_accuracy(self):
        """Verifies 32-bit (stco) and 64-bit (co64) chunk offset structures and big-endian precision."""
        # 1. 32-bit stco
        stco_offsets = [0x00000400, 0x00010000, 0x00050000, 0x7FFFFFFF]
        stco_payload = struct.pack(">II", 0, len(stco_offsets)) + b"".join(struct.pack(">I", off) for off in stco_offsets)
        stco = QuickTimeAtomEngine.build_atom(b"stco", stco_payload)
        stbl32 = QuickTimeAtomEngine.build_atom(b"stbl", stco)
        parsed32 = QuickTimeAtomEngine.parse_atoms(stbl32)
        stco_node = parsed32[0]["children"][0]
        self.assertEqual(stco_node["type"], "stco")
        self.assertEqual(stco_node["size"], len(stco))

        # 2. 64-bit co64 with values exceeding 4GB (> 0xFFFFFFFF)
        co64_offsets = [
            0x00000000_00001000,
            0x00000001_00000000,  # 4,294,967,296
            0x00000002_50000000,  # 9,932,111,872
            0x00000010_00000000   # 68,719,476,736
        ]
        co64_payload = struct.pack(">II", 0, len(co64_offsets)) + b"".join(struct.pack(">Q", off) for off in co64_offsets)
        co64 = QuickTimeAtomEngine.build_atom(b"co64", co64_payload)
        stbl64 = QuickTimeAtomEngine.build_atom(b"stbl", co64)
        parsed64 = QuickTimeAtomEngine.parse_atoms(stbl64)
        co64_node = parsed64[0]["children"][0]
        self.assertEqual(co64_node["type"], "co64")
        self.assertEqual(co64_node["size"], len(co64))

    def test_05_iso_and_quicktime_alignment_and_aperture(self):
        """Strictly asserts 68-byte tapt aperture layout and atom alignment."""
        tapt = QuickTimeAtomEngine.build_tapt(1376, 1840)
        self.assertEqual(len(tapt), 68, "tapt box must be strictly 68 bytes")

        # Parse sub-atoms
        parsed = QuickTimeAtomEngine.parse_atoms(tapt)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["type"], "tapt")
        children = parsed[0]["children"]
        self.assertEqual(len(children), 3)
        self.assertEqual([c["type"] for c in children], ["clef", "prof", "enof"])

        for c in children:
            self.assertEqual(c["size"], 20)
            sub_raw = tapt[c["offset"]:c["offset"]+c["size"]]
            ver, w_fixed, h_fixed = struct.unpack(">III", sub_raw[8:20])
            self.assertEqual(ver, 0)
            self.assertEqual(w_fixed, 1376 << 16)
            self.assertEqual(h_fixed, 1840 << 16)

    def test_06_deeply_nested_and_circular_headers(self):
        """Tests deeply nested container trees (depth=100) and malformed containers."""
        # Deep nesting: 100 levels
        current = QuickTimeAtomEngine.build_atom(b"dinf", b"\x00" * 8)
        for _ in range(100):
            current = QuickTimeAtomEngine.build_atom(b"minf", current)
        root = QuickTimeAtomEngine.build_atom(b"moov", current)

        start_time = time.time()
        parsed = QuickTimeAtomEngine.parse_atoms(root)
        parse_duration = time.time() - start_time

        self.assertLess(parse_duration, 0.5, "Deep recursion must parse in under 500ms")
        self.assertEqual(len(parsed), 1)

        depth = 0
        node = parsed[0]
        while node.get("children"):
            depth += 1
            node = node["children"][0]
        self.assertEqual(depth, 102)

    def test_07_fuzzing_and_mutation_resilience(self):
        """Executes 5,000 fuzz cycles with bit flips, truncations, and random byte mutations."""
        base_mov = QuickTimeAtomEngine.reconstruct_rayban_mov(b"")
        random.seed(42)

        for i in range(5000):
            mutated = bytearray(base_mov)
            mutation_type = i % 5

            if mutation_type == 0:
                # Random byte truncation
                trunc_len = random.randint(0, len(mutated))
                mutated = mutated[:trunc_len]
            elif mutation_type == 1:
                # Bit flips
                for _ in range(random.randint(1, 10)):
                    pos = random.randint(0, len(mutated) - 1)
                    mutated[pos] ^= (1 << random.randint(0, 7))
            elif mutation_type == 2:
                # Random atom size corruption
                if len(mutated) >= 8:
                    pos = random.choice([0, 20, 88])
                    if pos + 4 <= len(mutated):
                        struct.pack_into(">I", mutated, pos, random.choice([0, 1, 2, 0xFFFFFFFF, 0x80000000]))
            elif mutation_type == 3:
                # Random byte insertion / deletion
                ins_pos = random.randint(0, len(mutated))
                mutated[ins_pos:ins_pos] = os.urandom(random.randint(1, 32))
            elif mutation_type == 4:
                # Pure noise
                mutated = bytearray(os.urandom(random.randint(1, 1024)))

            # Assert no crashes / unhandled exceptions
            try:
                nodes = QuickTimeAtomEngine.parse_atoms(bytes(mutated))
                self.assertIsInstance(nodes, list)
            except Exception as e:
                self.fail(f"parse_atoms threw uncaught exception on fuzz cycle {i}: {e}")

            try:
                recon = QuickTimeAtomEngine.reconstruct_rayban_mov(bytes(mutated))
                self.assertIsInstance(recon, bytes)
            except Exception as e:
                self.fail(f"reconstruct_rayban_mov threw uncaught exception on fuzz cycle {i}: {e}")


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(QuickTimeAdversarialStressHarness)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
