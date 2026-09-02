## 2026-09-03T06:06:38Z
Mission: Investigate and document in deep technical detail the specifications for Ray-Ban Meta Smart Glasses media synthesis:
1. Video format and QuickTime Atom structure:
   - Target resolution: 1376x1840 vertical video (30/60 fps), H.264/AAC in .MOV container.
   - QuickTime atom layout and metadata required by Instagram's detection algorithm for unlocking "Spin View" (e.g. `udta`, `meta`, `keys`, `ilst`, camera model tags, specific QuickTime atoms or `metaspin` container profile).
   - FFmpeg WebAssembly (@ffmpeg/ffmpeg / @ffmpeg/util) conversion commands, filter chains (scale/crop to 1376:1840), encoding flags, and post-processing container atom reconstruction if needed.
   - Stripping original device/GPS metadata while preserving visual/audio quality.
2. Photo EXIF and TIFF format:
   - Target aspect ratio / resolution (1376x1840 or native Ray-Ban Meta photo resolution e.g. 3024x4032 / 1376x1840).
   - Exact EXIF/TIFF tags: Make="Luxottica", Model="Ray-Ban Meta Smart Glasses", Software="Meta View", LensModel, FocalLength, orientation, etc.
   - In-browser libraries (e.g. piexifjs, exifr, exif-js, canvas) to manipulate and inject EXIF into JPEG/PNG.
3. Transfer Guide details:
   - AirDrop instructions for iOS to prevent iOS photo transcoding.
   - Android transfer guide (USB File Transfer / Nearby Share / Quick Share) preserving original file container.
