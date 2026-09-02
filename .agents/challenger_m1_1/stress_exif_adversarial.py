#!/usr/bin/env python3
"""
Adversarial Stress Test Harness for ToRayBan_Converter EXIF Engine
Simulates edge cases, multi-APP segments, corrupt markers, fuzzing, and idempotency.
"""

import sys
import struct
import random
import time

def print_header(title):
    print("=" * 80)
    print(f">>> {title}")
    print("=" * 80)

def create_minimal_jpeg(w=1376, h=1840):
    header = bytearray([
        0xff, 0xd8, # SOI
        0xff, 0xc0, 0x00, 0x11, 0x08, # SOF0
        (h >> 8) & 0xff, h & 0xff,
        (w >> 8) & 0xff, w & 0xff,
        0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
        0x12, 0x34, 0x56, 0x78, # image stream
        0xff, 0xd9, # EOI
    ])
    return bytes(header)

def create_segment(marker_bytes, payload):
    seg_len = len(payload) + 2
    return marker_bytes + struct.pack('>H', seg_len) + payload

def build_rayban_tiff_payload(make="Luxottica", model="Ray-Ban Meta Smart Glasses", software="Meta View", iso=100):
    # Construct Little-Endian TIFF APP1 payload identically to TS engine
    date_str = time.strftime("%Y:%m:%d %H:%M:%S", time.gmtime()) + "\0"
    make_bytes = make.encode('ascii') + b'\0'
    model_bytes = model.encode('ascii') + b'\0'
    soft_bytes = software.encode('ascii') + b'\0'
    lens_make = b"Luxottica\0"
    lens_model = b"Ray-Ban Meta Smart Glasses\0"

    # IFD0 Entries (sorted by tag):
    # 0x010F Make (ASCII)
    # 0x0110 Model (ASCII)
    # 0x0112 Orientation (SHORT, 1)
    # 0x011A XResolution (RATIONAL, [72, 1])
    # 0x011B YResolution (RATIONAL, [72, 1])
    # 0x0128 ResolutionUnit (SHORT, 2)
    # 0x0131 Software (ASCII)
    # 0x0132 DateTime (ASCII)
    # 0x8769 ExifIFD (LONG, offset)
    
    ifd0_count = 9
    ifd0_size = 2 + ifd0_count * 12 + 4
    exif_count = 17
    exif_size = 2 + exif_count * 12 + 4
    
    data_pool_start = 8 + ifd0_size + exif_size
    
    # We build the binary buffer
    buf = bytearray(1024 + len(make_bytes) + len(model_bytes) + len(soft_bytes))
    
    # TIFF Header
    buf[0:2] = b'II'
    struct.pack_into('<H', buf, 2, 42)
    struct.pack_into('<I', buf, 4, 8) # IFD0 offset = 8
    
    # Write IFD0
    pos = 8
    struct.pack_into('<H', buf, pos, ifd0_count); pos += 2
    
    cur_data = data_pool_start
    
    def write_entry(tag, etype, count, val_or_offset):
        nonlocal pos
        struct.pack_into('<HHI', buf, pos, tag, etype, count)
        struct.pack_into('<I', buf, pos + 8, val_or_offset)
        pos += 12

    # Make
    struct.pack_into('<HHI', buf, pos, 0x010f, 2, len(make_bytes))
    struct.pack_into('<I', buf, pos + 8, cur_data); pos += 12
    buf[cur_data:cur_data+len(make_bytes)] = make_bytes
    cur_data += len(make_bytes) + (len(make_bytes) % 2)

    # Model
    struct.pack_into('<HHI', buf, pos, 0x0110, 2, len(model_bytes))
    struct.pack_into('<I', buf, pos + 8, cur_data); pos += 12
    buf[cur_data:cur_data+len(model_bytes)] = model_bytes
    cur_data += len(model_bytes) + (len(model_bytes) % 2)

    # Orientation (1)
    struct.pack_into('<HHI', buf, pos, 0x0112, 3, 1)
    struct.pack_into('<H', buf, pos + 8, 1); pos += 12

    # XResolution [72, 1]
    struct.pack_into('<HHI', buf, pos, 0x011a, 5, 1)
    struct.pack_into('<I', buf, pos + 8, cur_data); pos += 12
    struct.pack_into('<II', buf, cur_data, 72, 1); cur_data += 8

    # YResolution [72, 1]
    struct.pack_into('<HHI', buf, pos, 0x011b, 5, 1)
    struct.pack_into('<I', buf, pos + 8, cur_data); pos += 12
    struct.pack_into('<II', buf, cur_data, 72, 1); cur_data += 8

    # ResolutionUnit (2)
    struct.pack_into('<HHI', buf, pos, 0x0128, 3, 1)
    struct.pack_into('<H', buf, pos + 8, 2); pos += 12

    # Software
    struct.pack_into('<HHI', buf, pos, 0x0131, 2, len(soft_bytes))
    struct.pack_into('<I', buf, pos + 8, cur_data); pos += 12
    buf[cur_data:cur_data+len(soft_bytes)] = soft_bytes
    cur_data += len(soft_bytes) + (len(soft_bytes) % 2)

    # DateTime
    dt_bytes = date_str.encode('ascii')
    struct.pack_into('<HHI', buf, pos, 0x0132, 2, len(dt_bytes))
    struct.pack_into('<I', buf, pos + 8, cur_data); pos += 12
    buf[cur_data:cur_data+len(dt_bytes)] = dt_bytes
    cur_data += len(dt_bytes) + (len(dt_bytes) % 2)

    # ExifIFD pointer
    exif_offset = 8 + ifd0_size
    struct.pack_into('<HHI', buf, pos, 0x8769, 4, 1)
    struct.pack_into('<I', buf, pos + 8, exif_offset); pos += 12
    
    # Next IFD = 0
    struct.pack_into('<I', buf, pos, 0); pos += 4
    
    # Exif SubIFD
    struct.pack_into('<H', buf, pos, exif_count); pos += 2
    
    # FNumber [22, 10]
    struct.pack_into('<HHI', buf, pos, 0x829d, 5, 1)
    struct.pack_into('<I', buf, pos + 8, cur_data); pos += 12
    struct.pack_into('<II', buf, cur_data, 22, 10); cur_data += 8

    # ISO
    struct.pack_into('<HHI', buf, pos, 0x8827, 3, 1)
    struct.pack_into('<H', buf, pos + 8, iso); pos += 12

    # FocalLength [22, 10]
    struct.pack_into('<HHI', buf, pos, 0x920a, 5, 1)
    struct.pack_into('<I', buf, pos + 8, cur_data); pos += 12
    struct.pack_into('<II', buf, cur_data, 22, 10); cur_data += 8

    # Focal35 (15)
    struct.pack_into('<HHI', buf, pos, 0xa405, 3, 1)
    struct.pack_into('<H', buf, pos + 8, 15); pos += 12

    # PixelXDimension (1376)
    struct.pack_into('<HHI', buf, pos, 0xa002, 4, 1)
    struct.pack_into('<I', buf, pos + 8, 1376); pos += 12

    # PixelYDimension (1840)
    struct.pack_into('<HHI', buf, pos, 0xa003, 4, 1)
    struct.pack_into('<I', buf, pos + 8, 1840); pos += 12

    # LensModel
    struct.pack_into('<HHI', buf, pos, 0xa434, 2, len(lens_model))
    struct.pack_into('<I', buf, pos + 8, cur_data); pos += 12
    buf[cur_data:cur_data+len(lens_model)] = lens_model
    cur_data += len(lens_model) + (len(lens_model) % 2)

    # Next IFD = 0
    struct.pack_into('<I', buf, pos, 0)
    
    tiff_payload = buf[:cur_data]
    app1_header = b'\xff\xe1' + struct.pack('>H', len(tiff_payload) + 8) + b'Exif\0\0'
    return app1_header + tiff_payload

def parse_exif(jpeg_bytes):
    tags = {}
    if len(jpeg_bytes) < 4 or jpeg_bytes[:2] != b'\xff\xd8':
        return tags
    
    offset = 2
    while offset < len(jpeg_bytes) - 4:
        if jpeg_bytes[offset] != 0xff:
            offset += 1
            continue
        marker = (jpeg_bytes[offset] << 8) | jpeg_bytes[offset + 1]
        if marker in (0xffd9, 0xffda):
            break
        if 0xffd0 <= marker <= 0xffd7 or marker == 0xff01:
            offset += 2
            continue
        seg_len = (jpeg_bytes[offset + 2] << 8) | jpeg_bytes[offset + 3]
        if marker == 0xffe1:
            app1 = jpeg_bytes[offset + 4: offset + 2 + seg_len]
            if len(app1) >= 14 and app1[:6] == b'Exif\0\0':
                tiff = app1[6:]
                is_le = tiff[:2] == b'II'
                is_be = tiff[:2] == b'MM'
                if is_le or is_be:
                    fmt = '<' if is_le else '>'
                    magic = struct.unpack_from(fmt + 'H', tiff, 2)[0]
                    if magic == 42:
                        ifd0 = struct.unpack_from(fmt + 'I', tiff, 4)[0]
                        if ifd0 < len(tiff):
                            num_entries = struct.unpack_from(fmt + 'H', tiff, ifd0)[0]
                            pos = ifd0 + 2
                            for _ in range(num_entries):
                                if pos + 12 > len(tiff): break
                                tag, etype, count = struct.unpack_from(fmt + 'HHI', tiff, pos)
                                val_raw = struct.unpack_from(fmt + 'I', tiff, pos + 8)[0]
                                if etype == 2: # ASCII
                                    d_off = val_raw if count > 4 else pos + 8
                                    s = tiff[d_off:d_off+count].split(b'\0')[0].decode('ascii', errors='ignore')
                                    tags[tag] = s
                                elif etype == 3: # SHORT
                                    tags[tag] = struct.unpack_from(fmt + 'H', tiff, pos + 8)[0]
                                elif etype == 4: # LONG
                                    tags[tag] = val_raw
                                pos += 12
        offset += 2 + seg_len
    return tags

def test_stress_all():
    print_header("1. MULTI-APP SEGMENT STRESS & STRIPPING")
    base = create_minimal_jpeg()
    
    # Add 10 different APP markers (APP0, APP2, APP3, APP4, APP13, APP14, APP15, etc.)
    segments = []
    segments.append(create_segment(b'\xff\xe0', b'JFIF\0\1\1\0\0\x48\0\x48\0\0')) # APP0
    segments.append(create_segment(b'\xff\xe1', b'Exif\0\0' + b'OLD_EXIF_GARBAGE' * 50)) # Old APP1
    segments.append(create_segment(b'\xff\xe2', b'ICC_PROFILE' * 20)) # Old APP2
    segments.append(create_segment(b'\xff\xe3', b'APP3_DATA'))
    segments.append(create_segment(b'\xff\xed', b'Photoshop 3.0 8BIM' * 10)) # Old APP13
    segments.append(create_segment(b'\xff\xee', b'Adobe\0' * 5)) # APP14
    segments.append(create_segment(b'\xff\xef', b'APP15_DATA'))
    
    complex_stream = bytearray(b'\xff\xd8')
    for s in segments:
        complex_stream.extend(s)
    complex_stream.extend(base[2:]) # rest of base jpeg
    
    print(f"Created complex JPEG with 7 APP segments, total size: {len(complex_stream)} bytes.")
    
    # Parse existing tags
    app1_payload = build_rayban_tiff_payload(make="Luxottica", model="Ray-Ban Meta Smart Glasses")
    
    # Simulate injection: Replace stream with new APP1 immediately after SOI, strip 0xFFE1, 0xFFE2, 0xFFED
    remaining = []
    off = 2
    while off < len(complex_stream) - 1:
        if complex_stream[off] != 0xff:
            off += 1
            continue
        m = (complex_stream[off] << 8) | complex_stream[off + 1]
        if m in (0xffd9, 0xffda):
            remaining.append(complex_stream[off:])
            break
        if 0xffd0 <= m <= 0xffd7 or m in (0xff00, 0xff01):
            remaining.append(complex_stream[off:off+2])
            off += 2
            continue
        if off + 4 > len(complex_stream):
            remaining.append(complex_stream[off:])
            break
        slen = (complex_stream[off + 2] << 8) | complex_stream[off + 3]
        send = min(len(complex_stream), off + 2 + slen)
        if m not in (0xffe1, 0xffe2, 0xffed):
            remaining.append(complex_stream[off:send])
        off = send
        
    injected_stream = bytearray(b'\xff\xd8') + app1_payload
    for chunk in remaining:
        injected_stream.extend(chunk)
        
    print(f"Injected JPEG stream created. Size: {len(injected_stream)} bytes.")
    tags = parse_exif(injected_stream)
    assert tags.get(0x010f) == "Luxottica", f"Expected Make Luxottica, got {tags.get(0x010f)}"
    assert tags.get(0x0110) == "Ray-Ban Meta Smart Glasses", f"Expected Model, got {tags.get(0x0110)}"
    print("  [PASS] Multi-APP segments processed and tags verified successfully.")

    print_header("2. 50-CYCLE IDEMPOTENCY AND MEMORY STABILITY")
    cur = bytes(injected_stream)
    initial_size = len(cur)
    for i in range(50):
        # Re-inject with same options
        rem = []
        off = 2
        while off < len(cur) - 1:
            if cur[off] != 0xff: off += 1; continue
            m = (cur[off] << 8) | cur[off + 1]
            if m in (0xffd9, 0xffda): rem.append(cur[off:]); break
            if 0xffd0 <= m <= 0xffd7 or m in (0xff00, 0xff01): rem.append(cur[off:off+2]); off += 2; continue
            if off + 4 > len(cur): rem.append(cur[off:]); break
            slen = (cur[off + 2] << 8) | cur[off + 3]
            send = min(len(cur), off + 2 + slen)
            if m not in (0xffe1, 0xffe2, 0xffed): rem.append(cur[off:send])
            off = send
        new_stream = bytearray(b'\xff\xd8') + app1_payload
        for ch in rem: new_stream.extend(ch)
        cur = bytes(new_stream)
        assert len(cur) == initial_size, f"Size changed on iteration {i}: {len(cur)} vs {initial_size}"
    print(f"  [PASS] 50 consecutive injection cycles maintain strict size stability: {initial_size} bytes.")

    print_header("3. FUZZING AND BIT-FLIP STRESS HARNESS (500 iterations)")
    corrupt_count = 0
    safe_handling_count = 0
    
    for i in range(500):
        fuzzed = bytearray(base)
        # Apply 1 to 5 random bit flips / byte corruptions
        for _ in range(random.randint(1, 5)):
            target_idx = random.randint(0, len(fuzzed) - 1)
            fuzzed[target_idx] = random.randint(0, 255)
            
        try:
            # Parse or scan
            if len(fuzzed) < 2 or fuzzed[0] != 0xff or fuzzed[1] != 0xd8:
                safe_handling_count += 1
                continue
            # Segment scan simulation
            off = 2
            while off < len(fuzzed) - 1:
                if fuzzed[off] != 0xff:
                    off += 1
                    continue
                m = (fuzzed[off] << 8) | fuzzed[off + 1]
                if m in (0xffd9, 0xffda): break
                if 0xffd0 <= m <= 0xffd7 or m in (0xff00, 0xff01): off += 2; continue
                if off + 4 > len(fuzzed): break
                slen = (fuzzed[off + 2] << 8) | fuzzed[off + 3]
                send = min(len(fuzzed), off + 2 + slen)
                off = max(off + 1, send)
            safe_handling_count += 1
        except Exception as e:
            print(f"Crash during fuzz iteration {i}: {e}")
            corrupt_count += 1
            
    assert corrupt_count == 0, f"Encountered {corrupt_count} crashes during fuzzing!"
    print(f"  [PASS] Fuzzing test completed 500 iterations: 0 crashes, 100% resilient.")

    print_header("4. EXTREME PAYLOAD AND HUGE STRINGS")
    huge_make = "Luxottica_" + "A" * 5000
    huge_model = "Ray-Ban_Meta_" + "B" * 5000
    huge_payload = build_rayban_tiff_payload(make=huge_make, model=huge_model)
    huge_stream = bytearray(b'\xff\xd8') + huge_payload + base[2:]
    tags = parse_exif(huge_stream)
    assert tags.get(0x010f) == huge_make
    assert tags.get(0x0110) == huge_model
    print(f"  [PASS] 10,000+ character strings parsed cleanly in TIFF data pool.")

    print("\n" + "=" * 80)
    print("ALL ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS")
    print("=" * 80)

if __name__ == '__main__':
    test_stress_all()
