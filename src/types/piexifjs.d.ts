declare module 'piexifjs' {
  export interface IExif {
    '0th'?: Record<number, any>;
    Exif?: Record<number, any>;
    GPS?: Record<number, any>;
    Interop?: Record<number, any>;
    '1st'?: Record<number, any>;
    thumbnail?: string | null;
  }

  export const TagValues: {
    ImageIFD: Record<string, number>;
    ExifIFD: Record<string, number>;
    GPSIFD: Record<string, number>;
  };

  export function load(jpegBinary: string): IExif;
  export function dump(exifObj: IExif): string;
  export function insert(exifBinary: string, jpegBinary: string): string;
  export function remove(jpegBinary: string): string;
}
