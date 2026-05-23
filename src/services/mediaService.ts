import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'kaamnow_preset';

class MediaService {
  /**
   * Prompts the user to pick an image from their gallery.
   */
  async pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Sorry, we need camera roll permissions to make this work!');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8, // Basic compression
    });

    if (!result.canceled && result.assets.length > 0) {
      return result.assets[0];
    }
    return null;
  }

  /**
   * Uploads an image to Cloudinary and returns the optimized URL.
   */
  async uploadImage(imageUri: string): Promise<string> {
    if (!process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      console.warn('[MediaService] Missing Cloudinary Cloud Name. Returning local URI for development.');
      return imageUri;
    }

    const data = new FormData();
    
    // Web requires a Blob/File, Mobile requires an object with uri, type, name
    if (Platform.OS === 'web') {
      const res = await fetch(imageUri);
      const blob = await res.blob();
      data.append('file', blob);
    } else {
      const filename = imageUri.split('/').pop() || 'upload.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      
      data.append('file', { uri: imageUri, name: filename, type } as any);
    }

    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to upload image');
      }

      // Automatically request auto-format and auto-quality
      const optimizedUrl = result.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
      return optimizedUrl;
    } catch (error: any) {
      console.error('[MediaService] Cloudinary Upload Error:', error);
      throw new Error('Image upload failed. Please try again.');
    }
  }

  /**
   * Helper to pick and upload an image in one step.
   */
  async pickAndUpload(): Promise<string | null> {
    const asset = await this.pickImage();
    if (asset) {
      return await this.uploadImage(asset.uri);
    }
    return null;
  }
}

export const mediaService = new MediaService();
