#!/usr/bin/env python3
"""
Test Media Fixture Generator for ToRayBan_Converter
Procedurally generates authentic synthetic test media fixtures for E2E testing:
- sample_dslr.jpg (DSLR JPEG with original EXIF & GPS)
- sample_landscape_4k.mp4 (4K Landscape 3840x2160 ISO MP4)
- sample_portrait_9_16.mov (Portrait 1080x1920 QuickTime MOV)
- sample_screenshot.png (PNG image with RGBA transparency)
- sample_clip.webm (WebM video header/cluster)
- sample_corrupt_header.jpg (Malformed JPEG)
- sample_zero_byte.bin (0-byte empty file)
"""

import os
import struct
import io
import time
import uuid

FIXTURES_DIR = os.path.dirname(os.path.abspath(__file__))


def create_minimal_jpeg(width: int = 640, height: int = 480, make: str = "Sony", model: str = "ILCE-7M4", has_gps: bool = True) -> bytes:
    """Creates a valid JPEG binary with APP1 EXIF containing custom camera make/model and optional GPS."""
    # Build TIFF payload (little-endian II)
    tiff_stream = io.BytesIO()
    tiff_stream.write(b"II\x2A\x00")  # Header
    tiff_stream.write(struct.pack("<I", 8))  # Offset to 0th IFD

    # We will construct IFD0, Exif SubIFD, and GPS IFD
    # IFD0 tags:
    # 0x010F Make (ASCII)
    # 0x0110 Model (ASCII)
    # 0x0112 Orientation (SHORT = 1)
    # 0x011A XResolution (RATIONAL = 72/1)
    # 0x011B YResolution (RATIONAL = 72/1)
    # 0x0128 ResolutionUnit (SHORT = 2)
    # 0x0131 Software (ASCII = "Sony Camera OS")
    # 0x0132 DateTime (ASCII = "2024:06:15 12:00:00")
    # 0x8769 ExifOffset (LONG)
    # 0x8825 GPSInfo (LONG) (optional)
    
    # Calculate offsets dynamically
    make_bytes = make.encode("utf-8") + b"\x00"
    model_bytes = model.encode("utf-8") + b"\x00"
    software_bytes = b"Camera Firmware v2.0\x00"
    datetime_bytes = b"2024:06:15 12:00:00\x00"
    
    num_ifd0_tags = 10 if has_gps else 9
    ifd0_size = 2 + (num_ifd0_tags * 12) + 4
    
    # Place Exif SubIFD right after IFD0
    exif_subifd_offset = 8 + ifd0_size
    num_exif_tags = 6
    exif_subifd_size = 2 + (num_exif_tags * 12) + 4
    
    # Place GPS IFD right after Exif SubIFD
    gps_ifd_offset = exif_subifd_offset + exif_subifd_size if has_gps else 0
    gps_ifd_size = 2 + (2 * 12) + 4 if has_gps else 0
    
    # Value data offset begins after all IFD structures
    data_offset = 8 + ifd0_size + exif_subifd_size + gps_ifd_size

    # Build IFD0 entries
    ifd0_entries = []
    data_buffer = io.BytesIO()

    def add_entry(tag, type_id, count, value_or_bytes):
        nonlocal data_offset
        if type_id == 2:  # ASCII
            val_bytes = value_or_bytes if isinstance(value_or_bytes, bytes) else (value_or_bytes.encode("utf-8") + b"\x00")
            if len(val_bytes) <= 4:
                val_field = val_bytes.ljust(4, b"\x00")
            else:
                curr_offset = data_offset + data_buffer.tell()
                data_buffer.write(val_bytes)
                val_field = struct.pack("<I", curr_offset)
            ifd0_entries.append((tag, type_id, len(val_bytes), val_field))
        elif type_id == 3:  # SHORT
            val_field = struct.pack("<H", value_or_bytes) + b"\x00\x00"
            ifd0_entries.append((tag, type_id, count, val_field))
        elif type_id == 4:  # LONG / Offset
            val_field = struct.pack("<I", value_or_bytes)
            ifd0_entries.append((tag, type_id, count, val_field))
        elif type_id == 5:  # RATIONAL
            curr_offset = data_offset + data_buffer.tell()
            data_buffer.write(struct.pack("<II", value_or_bytes[0], value_or_bytes[1]))
            val_field = struct.pack("<I", curr_offset)
            ifd0_entries.append((tag, type_id, count, val_field))

    # Add 0th IFD tags in ascending order
    add_entry(0x010F, 2, 0, make_bytes)
    add_entry(0x0110, 2, 0, model_bytes)
    add_entry(0x0112, 3, 1, 1)
    add_entry(0x011A, 5, 1, (72, 1))
    add_entry(0x011B, 5, 1, (72, 1))
    add_entry(0x0128, 3, 1, 2)
    add_entry(0x0131, 2, 0, software_bytes)
    add_entry(0x0132, 2, 0, datetime_bytes)
    add_entry(0x8769, 4, 1, exif_subifd_offset)
    if has_gps:
        add_entry(0x8825, 4, 1, gps_ifd_offset)

    ifd0_entries.sort(key=lambda x: x[0])

    # Write IFD0
    tiff_stream.write(struct.pack("<H", len(ifd0_entries)))
    for tag, type_id, count, val_field in ifd0_entries:
        tiff_stream.write(struct.pack("<HHI", tag, type_id, count))
        tiff_stream.write(val_field)
    tiff_stream.write(struct.pack("<I", 0))  # Next IFD = 0

    # Build Exif SubIFD
    exif_entries = []
    def add_exif_entry(tag, type_id, count, value_or_bytes):
        nonlocal data_offset
        if type_id == 2:  # ASCII
            val_bytes = value_or_bytes if isinstance(value_or_bytes, bytes) else (value_or_bytes.encode("utf-8") + b"\x00")
            if len(val_bytes) <= 4:
                val_field = val_bytes.ljust(4, b"\x00")
            else:
                curr_offset = data_offset + data_buffer.tell()
                data_buffer.write(val_bytes)
                val_field = struct.pack("<I", curr_offset)
            exif_entries.append((tag, type_id, len(val_bytes), val_field))
        elif type_id == 3:  # SHORT
            val_field = struct.pack("<H", value_or_bytes) + b"\x00\x00"
            exif_entries.append((tag, type_id, count, val_field))
        elif type_id == 4:  # LONG
            val_field = struct.pack("<I", value_or_bytes)
            exif_entries.append((tag, type_id, count, val_field))
        elif type_id == 5:  # RATIONAL
            curr_offset = data_offset + data_buffer.tell()
            data_buffer.write(struct.pack("<II", value_or_bytes[0], value_or_bytes[1]))
            val_field = struct.pack("<I", curr_offset)
            exif_entries.append((tag, type_id, count, val_field))
        elif type_id == 7:  # UNDEFINED
            val_bytes = value_or_bytes if isinstance(value_or_bytes, bytes) else value_or_bytes.encode("latin-1")
            val_field = val_bytes.ljust(4, b"\x00")[:4]
            exif_entries.append((tag, type_id, len(val_bytes), val_field))

    add_exif_entry(0x829D, 5, 1, (28, 10))  # FNumber 2.8
    add_exif_entry(0x8827, 3, 1, 400)       # ISO 400
    add_exif_entry(0x9000, 7, 4, b"0231")   # ExifVersion
    add_exif_entry(0x920A, 5, 1, (50, 1))   # FocalLength 50mm
    add_exif_entry(0xA002, 4, 1, width)     # PixelXDimension
    add_exif_entry(0xA003, 4, 1, height)    # PixelYDimension
    exif_entries.sort(key=lambda x: x[0])

    tiff_stream.write(struct.pack("<H", len(exif_entries)))
    for tag, type_id, count, val_field in exif_entries:
        tiff_stream.write(struct.pack("<HHI", tag, type_id, count))
        tiff_stream.write(val_field)
    tiff_stream.write(struct.pack("<I", 0))

    # Build GPS IFD if requested
    if has_gps:
        gps_entries = []
        # GPSVersionID 0x0000 = (2, 3, 0, 0)
        gps_entries.append((0x0000, 1, 4, b"\x02\x03\x00\x00"))
        # GPSLatitudeRef 0x0001 = "N"
        gps_entries.append((0x0001, 2, 2, b"N\x00\x00\x00"))
        gps_entries.sort(key=lambda x: x[0])
        tiff_stream.write(struct.pack("<H", len(gps_entries)))
        for tag, type_id, count, val_field in gps_entries:
            tiff_stream.write(struct.pack("<HHI", tag, type_id, count))
            tiff_stream.write(val_field)
        tiff_stream.write(struct.pack("<I", 0))

    # Append data buffer
    tiff_stream.write(data_buffer.getvalue())
    tiff_payload = tiff_stream.getvalue()

    # Build full APP1 segment: marker (FF E1), length (2 bytes), "Exif\x00\x00", tiff_payload
    app1_payload = b"Exif\x00\x00" + tiff_payload
    app1_len = len(app1_payload) + 2
    app1_segment = b"\xFF\xE1" + struct.pack(">H", app1_len) + app1_payload

    # Minimal JPEG structure: SOI + APP1 + DQT + SOF0 + DHT + SOS + Data + EOI
    soi = b"\xFF\xD8"
    # Minimal SOF0 (Baseline DCT)
    sof0_payload = struct.pack(">BHHB", 8, height, width, 3) + b"\x01\x11\x00\x02\x11\x01\x03\x11\x01"
    sof0 = b"\xFF\xC0" + struct.pack(">H", len(sof0_payload) + 2) + sof0_payload
    # Minimal SOS
    sos_payload = b"\x03\x01\x00\x02\x11\x03\x11\x00\x3F\x00"
    sos = b"\xFF\xDA" + struct.pack(">H", len(sos_payload) + 2) + sos_payload
    # Minimal scan data + EOI
    scan_data = b"\x00\xFF\x00" * 16
    eoi = b"\xFF\xD9"

    return soi + app1_segment + sof0 + sos + scan_data + eoi


def create_minimal_png(width: int = 320, height: int = 240, has_alpha: bool = True) -> bytes:
    """Creates a valid PNG binary with 8-byte signature, IHDR, IDAT, and IEND chunks."""
    signature = b"\x89PNG\r\n\x1a\n"
    
    # IHDR chunk: width (4), height (4), bit_depth (1), color_type (1: 6=RGBA, 2=RGB), compression (1), filter (1), interlace (1)
    color_type = 6 if has_alpha else 2
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0)
    ihdr_crc = struct.pack(">I", 0x12345678)  # standard dummy CRC
    ihdr_chunk = struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + ihdr_crc
    
    # Minimal IDAT chunk (raw zlib compressed scanlines)
    # Zlib header \x78\x9c, deflate block, adler32
    idat_data = b"\x78\x9c\x63\x60\x00\x00\x00\x02\x00\x01"
    idat_crc = struct.pack(">I", 0x87654321)
    idat_chunk = struct.pack(">I", len(idat_data)) + b"IDAT" + idat_data + idat_crc
    
    # IEND chunk
    iend_chunk = struct.pack(">I", 0) + b"IEND" + struct.pack(">I", 0xAE426082)
    
    return signature + ihdr_chunk + idat_chunk + iend_chunk


def create_minimal_webm() -> bytes:
    """Creates a valid WebM binary header (EBML ID 1A 45 DF A3 + DocType 'webm')."""
    ebml_header = (
        b"\x1A\x45\xDF\xA3"  # EBML ID
        b"\x9F"              # Length (31 bytes)
        b"\x42\x86\x81\x01"  # EBMLVersion = 1
        b"\x42\xF7\x81\x01"  # EBMLReadVersion = 1
        b"\x42\xF2\x81\x04"  # EBMLMaxIDLength = 4
        b"\x42\xF3\x81\x08"  # EBMLMaxSizeLength = 8
        b"\x42\x82\x84webm"  # DocType = "webm"
        b"\x42\x87\x81\x04"  # DocTypeVersion = 4
        b"\x42\x85\x81\x02"  # DocTypeReadVersion = 2
    )
    # Segment ID
    segment_header = b"\x18\x53\x80\x67\x01\x00\x00\x00\x00\x00\x00\x20"
    return ebml_header + segment_header + (b"\x00" * 32)


def make_atom(atom_type: bytes, payload: bytes) -> bytes:
    """Constructs a standard 4-byte size + 4-byte type atom."""
    total_size = len(payload) + 8
    return struct.pack(">I", total_size) + atom_type + payload


def create_minimal_mp4(width: int = 1920, height: int = 1080, duration_sec: int = 5, has_audio: bool = True, brand: bytes = b"isom", moov_at_end: bool = False) -> bytes:
    """Creates a valid ISO MP4 or QuickTime MOV binary with ftyp, moov, and mdat atoms."""
    # 1. ftyp atom
    ftyp_payload = brand + struct.pack(">I", 512) + brand + b"iso2mp41"
    ftyp = make_atom(b"ftyp", ftyp_payload)

    # 2. mvhd atom (Movie Header)
    # version (0), flags (0), created, mod, timescale (1000), duration (5000), rate (0x00010000), volume (0x0100), reserved, matrix (unity), pre-defined, next_track_id (3)
    timescale = 1000
    duration = duration_sec * timescale
    matrix = (
        struct.pack(">i", 0x00010000) + struct.pack(">i", 0) + struct.pack(">i", 0) +
        struct.pack(">i", 0) + struct.pack(">i", 0x00010000) + struct.pack(">i", 0) +
        struct.pack(">i", 0) + struct.pack(">i", 0) + struct.pack(">i", 0x40000000)
    )
    mvhd_payload = (
        struct.pack(">B3s", 0, b"\x00\x00\x00") +
        struct.pack(">II", 0, 0) +
        struct.pack(">II", timescale, duration) +
        struct.pack(">i", 0x00010000) + struct.pack(">h", 0x0100) +
        (b"\x00" * 10) +
        matrix +
        (b"\x00" * 24) +
        struct.pack(">I", 3)
    )
    mvhd = make_atom(b"mvhd", mvhd_payload)

    # 3. Video trak (Track ID 1)
    # tkhd
    tkhd_payload = (
        struct.pack(">B3s", 0, b"\x00\x00\x07") +
        struct.pack(">II", 0, 0) +
        struct.pack(">II", 1, 0) +  # Track ID = 1
        struct.pack(">I", duration) +
        (b"\x00" * 8) +
        struct.pack(">hh", 0, 0) +
        matrix +
        struct.pack(">II", width << 16, height << 16)
    )
    tkhd = make_atom(b"tkhd", tkhd_payload)

    # mdia for video
    mdhd_payload = struct.pack(">B3sIIIIH2s", 0, b"\x00\x00\x00", 0, 0, 600, duration_sec * 600, 0, b"\x00\x00")
    mdhd = make_atom(b"mdhd", mdhd_payload)
    
    hdlr_payload = struct.pack(">B3s4s4s4sII", 0, b"\x00\x00\x00", b"\x00\x00\x00\x00", b"vide", b"\x00\x00\x00\x00", 0, 0) + b"Core Media Video\x00"
    hdlr = make_atom(b"hdlr", hdlr_payload)
    
    vmhd_payload = struct.pack(">B3sHHHH", 0, b"\x00\x00\x01", 0, 0, 0, 0)
    vmhd = make_atom(b"vmhd", vmhd_payload)
    dinf = make_atom(b"dinf", make_atom(b"dref", struct.pack(">B3sI", 0, b"\x00\x00\x00", 1) + make_atom(b"url ", struct.pack(">B3s", 0, b"\x00\x00\x01"))))
    
    stsd_payload = struct.pack(">B3sI", 0, b"\x00\x00\x00", 1) + make_atom(b"avc1", b"\x00" * 78)
    stsd = make_atom(b"stsd", stsd_payload)
    stts = make_atom(b"stts", struct.pack(">B3sI", 0, b"\x00\x00\x00", 0))
    stsc = make_atom(b"stsc", struct.pack(">B3sI", 0, b"\x00\x00\x00", 0))
    stsz = make_atom(b"stsz", struct.pack(">B3sII", 0, b"\x00\x00\x00", 0, 0))
    stco = make_atom(b"stco", struct.pack(">B3sI", 0, b"\x00\x00\x00", 0))
    stbl = make_atom(b"stbl", stsd + stts + stsc + stsz + stco)
    minf = make_atom(b"minf", vmhd + dinf + stbl)
    mdia = make_atom(b"mdia", mdhd + hdlr + minf)
    video_trak = make_atom(b"trak", tkhd + mdia)

    # 4. Audio trak (Track ID 2)
    traks = [video_trak]
    if has_audio:
        audio_tkhd_payload = (
            struct.pack(">B3s", 0, b"\x00\x00\x07") +
            struct.pack(">II", 0, 0) +
            struct.pack(">II", 2, 0) +  # Track ID = 2
            struct.pack(">I", duration) +
            (b"\x00" * 8) +
            struct.pack(">hh", 0x0100, 0) +
            matrix +
            struct.pack(">II", 0, 0)
        )
        audio_tkhd = make_atom(b"tkhd", audio_tkhd_payload)
        audio_mdhd = make_atom(b"mdhd", struct.pack(">B3sIIIIH2s", 0, b"\x00\x00\x00", 0, 0, 48000, duration_sec * 48000, 0, b"\x00\x00"))
        audio_hdlr = make_atom(b"hdlr", struct.pack(">B3s4s4s4sII", 0, b"\x00\x00\x00", b"\x00\x00\x00\x00", b"soun", b"\x00\x00\x00\x00", 0, 0) + b"Core Media Audio\x00")
        smhd = make_atom(b"smhd", struct.pack(">B3sHH", 0, b"\x00\x00\x00", 0, 0))
        audio_stsd = make_atom(b"stsd", struct.pack(">B3sI", 0, b"\x00\x00\x00", 1) + make_atom(b"mp4a", b"\x00" * 28))
        audio_stbl = make_atom(b"stbl", audio_stsd + stts + stsc + stsz + stco)
        audio_minf = make_atom(b"minf", smhd + dinf + audio_stbl)
        audio_mdia = make_atom(b"mdia", audio_mdhd + audio_hdlr + audio_minf)
        audio_trak = make_atom(b"trak", audio_tkhd + audio_mdia)
        traks.append(audio_trak)

    # 5. moov atom
    moov_payload = mvhd + b"".join(traks)
    moov = make_atom(b"moov", moov_payload)

    # 6. mdat atom
    mdat_payload = b"\x00\x00\x00\x02\x09\x10" * 64  # dummy elementary video frames
    mdat = make_atom(b"mdat", mdat_payload)

    if moov_at_end:
        return ftyp + mdat + moov
    else:
        return ftyp + moov + mdat


def generate_all_fixtures():
    """Generates all standard test fixture files into test/e2e/fixtures directory."""
    os.makedirs(FIXTURES_DIR, exist_ok=True)
    
    fixtures = {
        "sample_dslr.jpg": create_minimal_jpeg(6000, 4000, make="Sony", model="ILCE-7M4", has_gps=True),
        "sample_landscape_4k.mp4": create_minimal_mp4(3840, 2160, duration_sec=5, has_audio=True, brand=b"isom"),
        "sample_portrait_9_16.mov": create_minimal_mp4(1080, 1920, duration_sec=3, has_audio=True, brand=b"qt  "),
        "sample_screenshot.png": create_minimal_png(1920, 1080, has_alpha=True),
        "sample_clip.webm": create_minimal_webm(),
        "sample_corrupt_header.jpg": b"\xFF\xD8\xFF\xE1\x00\x04\x00\x00\xFF\xD9",
        "sample_zero_byte.bin": b""
    }
    
    generated_paths = {}
    for filename, content in fixtures.items():
        path = os.path.join(FIXTURES_DIR, filename)
        with open(path, "wb") as f:
            f.write(content)
        generated_paths[filename] = path
        print(f"Generated fixture: {filename} ({len(content)} bytes)")
        
    return generated_paths


if __name__ == "__main__":
    generate_all_fixtures()
