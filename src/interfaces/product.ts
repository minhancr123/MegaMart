export interface Product {

    id : number;
    name : string;
    description? : string;
    price : number;
    imageUrl : string;
    // createdAt : Date;
    // updatedAt : Date;
}
export interface Category {
  id: string
  name: string
  slug: string
  children?: Category[] 
}



export interface MainContentProps {
    featuredProducts: Product[];
    fetchCategories: Category[];
}