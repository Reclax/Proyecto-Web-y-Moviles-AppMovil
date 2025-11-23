import { API_BASE_URL } from "@/services/api";

export const formatCurrency = (value: number | string = 0) => {
  const amount = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

export const getAbsoluteUrl = (url: string) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;

  const baseUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;

  return `${baseUrl}${cleanUrl}`;
};

export const getProductCover = (product: any) => {
  const firstPhoto = product?.ProductPhotos?.[0];
  const url = firstPhoto?.url || product?.photos?.[0];
  return getAbsoluteUrl(url);
};

export const getProductGallery = (product: any = {}) => {
  if (product?.ProductPhotos?.length) {
    return product.ProductPhotos.map((photo: any) => {
      return getAbsoluteUrl(photo?.url);
    }).filter(Boolean);
  }

  if (Array.isArray(product?.photos) && product.photos.length > 0) {
    return product.photos.map((url: string) => {
      return getAbsoluteUrl(url);
    });
  }

  return [];
};

export const getCategoryName = (categoryId: number, categories: any[] = []) => {
  return categories.find((c) => c.id === categoryId)?.name || "Sin categoría";
};
