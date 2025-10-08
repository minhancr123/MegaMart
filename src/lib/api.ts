import axiosClient from "./axiosClient"

const productsAPI = {
    getFeatureProducts : () => axiosClient.get("/products/featured"), 
    getCategoriesList : () => axiosClient.get("/products/categories")
} 

export const fetchFeaturedProducts = async () => {
  try {
    const res = await productsAPI.getFeatureProducts()
    return Array.isArray(res.data) ? res.data : []
  } catch (error: any) {
    return error.response?.data?.message || "Failed to fetch products"
  }
}

export const fetchCategoriesList = async () => {
  try {
    const res = await productsAPI.getCategoriesList()
    return Array.isArray(res.data) ? res.data : []
  } catch (error: any) {
    return error.response?.data?.message || "Failed to fetch categories"
  }
}
