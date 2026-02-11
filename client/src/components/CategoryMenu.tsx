"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { fetchCategoriesList } from "@/lib/productApi";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
}

export default function CategoryMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategoriesList();
        // API already returns parent categories with children
        setCategories(data);
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg">
        <div className="animate-pulse space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 text-center text-gray-500 text-sm">
        Chưa có danh mục nào
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Categories List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="divide-y divide-gray-100"
      >
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <CategoryItem category={category} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function CategoryItem({ category }: { category: Category }) {
  const hasChildren = category.children && category.children.length > 0;

  if (!hasChildren) {
    return (
      <Link
        href={`/category/${category.slug}`}
        className="flex items-center justify-between px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 group"
      >
        <span className="text-sm text-gray-700 group-hover:text-blue-600 font-medium transition-colors duration-200">
          {category.name}
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
      </Link>
    );
  }

  return (
    <HoverCard openDelay={50} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Link
          href={`/category/${category.slug}`}
          className="flex items-center justify-between px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 group"
        >
          <span className="text-sm text-gray-700 group-hover:text-blue-600 font-medium transition-colors duration-200">
            {category.name}
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
        </Link>
      </HoverCardTrigger>

      <HoverCardContent
        side="right"
        align="start"
        className="w-96 p-0 border-2 border-blue-100"
        sideOffset={8}
      >
        <motion.div
          initial={{ opacity: 0, x: -10, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Subcategories List */}
          <div className="p-4 max-h-[400px] overflow-y-auto">
            <motion.div
              className="grid grid-cols-2 gap-2"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {category.children?.map((child) => (
                <motion.div
                  key={child.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <Link
                    href={`/category/${child.slug}`}
                    className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 rounded-lg transition-all duration-200 hover:shadow-md border border-transparent hover:border-blue-200 hover:scale-105 transform"
                  >
                    {child.name}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </HoverCardContent>
    </HoverCard>
  );
}
