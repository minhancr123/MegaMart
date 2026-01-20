import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductCard } from './ProductCard';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCompareStore } from '@/store/compareStore';

// Mock the stores
jest.mock('@/store/cartStore');
jest.mock('@/store/wishlistStore');
jest.mock('@/store/compareStore');

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

describe('ProductCard', () => {
  const mockProduct = {
    id: 1,
    name: 'Test Product',
    slug: 'test-product',
    description: 'This is a test product description',
    price: 100000,
    imageUrl: 'https://example.com/test.jpg',
    categoryId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variants: [
      {
        id: 1,
        productId: 1,
        sku: 'TEST-001',
        price: 100000,
        stock: 10,
        attributes: {
          color: 'Red',
          size: 'M',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        productId: 1,
        sku: 'TEST-002',
        price: 120000,
        stock: 5,
        attributes: {
          color: 'Blue',
          size: 'L',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const mockCartStore = {
    add: jest.fn(),
    items: [],
  };

  const mockWishlistStore = {
    toggle: jest.fn(),
    exists: jest.fn(() => false),
    items: [],
  };

  const mockCompareStore = {
    toggle: jest.fn(),
    exists: jest.fn(() => false),
    items: [],
  };

  beforeEach(() => {
    (useCartStore as unknown as jest.Mock).mockReturnValue(mockCartStore);
    (useWishlistStore as unknown as jest.Mock).mockReturnValue(mockWishlistStore);
    (useCompareStore as unknown as jest.Mock).mockReturnValue(mockCompareStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText(/This is a test product description/)).toBeInTheDocument();
  });

  it('displays product image', () => {
    render(<ProductCard product={mockProduct} />);

    const image = screen.getByAltText('Test Product');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/test.jpg');
  });

  it('shows correct number of variants', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('2 biến thể')).toBeInTheDocument();
  });

  it('displays price range correctly', () => {
    render(<ProductCard product={mockProduct} />);

    // Should show price range from min to max
    expect(screen.getByText(/100\.000 ₫/)).toBeInTheDocument();
    expect(screen.getByText(/120\.000 ₫/)).toBeInTheDocument();
  });

  it('shows total stock status', () => {
    render(<ProductCard product={mockProduct} />);

    // Total stock = 10 + 5 = 15
    expect(screen.getByText(/Còn 15 sản phẩm/)).toBeInTheDocument();
  });

  it('handles variant selection', async () => {
    render(<ProductCard product={mockProduct} />);

    // Click on variant dropdown trigger
    const dropdownTrigger = screen.getByText('Chọn biến thể...');
    fireEvent.click(dropdownTrigger);

    // Wait for dropdown to open and select first variant
    await waitFor(() => {
      const firstVariant = screen.getByText(/TEST-001/);
      expect(firstVariant).toBeInTheDocument();
      fireEvent.click(firstVariant);
    });

    // Verify variant is selected
    await waitFor(() => {
      expect(screen.getByText('TEST-001')).toBeInTheDocument();
    });
  });

  it('adds product to cart when button clicked', async () => {
    render(<ProductCard product={mockProduct} />);

    // Select a variant first
    const dropdownTrigger = screen.getByText('Chọn biến thể...');
    fireEvent.click(dropdownTrigger);

    await waitFor(() => {
      const firstVariant = screen.getByText(/TEST-001/);
      fireEvent.click(firstVariant);
    });

    // Click add to cart button
    const addToCartButton = screen.getByText(/Thêm vào giỏ/);
    fireEvent.click(addToCartButton);

    // Verify cart store was called
    await waitFor(() => {
      expect(mockCartStore.add).toHaveBeenCalled();
    });
  });

  it('toggles wishlist when heart icon clicked', () => {
    render(<ProductCard product={mockProduct} />);

    // Find and click wishlist button
    const wishlistButton = screen.getByLabelText('Yêu thích');
    fireEvent.click(wishlistButton);

    expect(mockWishlistStore.toggle).toHaveBeenCalledWith(mockProduct);
  });

  it('toggles compare when compare icon clicked', () => {
    render(<ProductCard product={mockProduct} />);

    // Find and click compare button
    const compareButton = screen.getByLabelText('So sánh');
    fireEvent.click(compareButton);

    expect(mockCompareStore.toggle).toHaveBeenCalledWith(mockProduct);
  });

  it('shows out of stock badge when stock is 0', () => {
    const outOfStockProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants[0],
          stock: 0,
        },
      ],
    };

    render(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText(/Hết hàng/)).toBeInTheDocument();
  });

  it('shows low stock warning when stock <= 5', () => {
    const lowStockProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants[0],
          stock: 3,
        },
      ],
    };

    render(<ProductCard product={lowStockProduct} />);

    expect(screen.getByText(/Sắp hết/)).toBeInTheDocument();
  });

  it('disables out of stock variants', async () => {
    const mixedStockProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants[0],
          stock: 0,
        },
        {
          ...mockProduct.variants[1],
          stock: 5,
        },
      ],
    };

    render(<ProductCard product={mixedStockProduct} />);

    // Open dropdown
    const dropdownTrigger = screen.getByText('Chọn biến thể...');
    fireEvent.click(dropdownTrigger);

    await waitFor(() => {
      // Out of stock variant should be disabled
      const outOfStockVariant = screen.getByText(/TEST-001/);
      expect(outOfStockVariant.closest('[disabled]')).toBeTruthy();
    });
  });

  it('formats price correctly with VND currency', () => {
    render(<ProductCard product={mockProduct} />);

    // Check if prices are formatted with dots as thousand separators
    expect(screen.getByText(/100\.000 ₫/)).toBeInTheDocument();
    expect(screen.getByText(/120\.000 ₫/)).toBeInTheDocument();
  });

  it('handles product without variants', () => {
    const noVariantProduct = {
      ...mockProduct,
      variants: [],
    };

    render(<ProductCard product={noVariantProduct} />);

    // Should show "Liên hệ" when no variants
    expect(screen.getByText(/Liên hệ/)).toBeInTheDocument();
  });

  it('applies hover effects (visual test)', () => {
    const { container } = render(<ProductCard product={mockProduct} />);

    const card = container.querySelector('.group');
    expect(card).toHaveClass('hover:border-blue-300');
    expect(card).toHaveClass('hover:shadow-xl');
  });
});
