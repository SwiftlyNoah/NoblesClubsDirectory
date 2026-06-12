// Club image upload (web-only concern, kept out of src/data/).
import { getDownloadURL, getStorage, storageRef, uploadBytes } from './firebase';
import { randomID } from '../data';

/** storage.rules: writes under /clubs/ must be images strictly under 5MB. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Upload a club banner to Storage at clubs/{randomID()} and return both the
 * legacy filename (`image`) and the public download URL (`image_url`).
 */
export async function uploadClubImage(file: File): Promise<{ image: string; image_url: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (PNG, JPG, GIF, …).');
  }
  if (file.size >= MAX_IMAGE_BYTES) {
    throw new Error('That image is too large — please choose one under 5MB.');
  }
  const image = randomID();
  const fileRef = storageRef(getStorage(), `clubs/${image}`);
  await uploadBytes(fileRef, file, { contentType: file.type });
  const image_url = await getDownloadURL(fileRef);
  return { image, image_url };
}
