import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export const pickImage = async (allowsMultiple: boolean = false) => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultiple,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      return allowsMultiple ? result.assets : [result.assets[0]];
    }
    return [];
  } catch (error) {
    console.error('Error picking image:', error);
    return [];
  }
};

export const takePhoto = async () => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

export const convertToFormData = (files: any[]) => {
  const formData = new FormData();

  files.forEach((file, index) => {
    formData.append('photos', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.fileName || `image_${index}.jpg`,
    } as any);
  });

  return formData;
};