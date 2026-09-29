'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { fetchProductsPaged, fetchCategoriesList, fetchBrands } from '@/lib/productApi';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Product, Category } from '@/interfaces/product';
import { addToCart } from '@/lib/cartApi';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import {
    Filter,
    SlidersHorizontal,
    X,
    Grid3x3,
    List,
    Package,
    Search,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton, ProductsGridSkeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export default function ProductsPage() {
    // useSearchParams bắt buộc phải nằm trong một Suspense boundary, nếu không
    // Next.js không cho trang này render tĩnh lúc build (xem SearchPage).
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <ProductsPageContent />
        </Suspense>
    );
}

function ProductsPageContent() {
    const router = useRouter();
    const { user } = useAuthStore();
    const cartStore = useCartStore();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<{ brand: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 36;

    // Kiểu hiển thị không nằm trong URL: nó chỉ là tuỳ chọn của thiết bị, và
    // đưa vào URL sẽ làm nút "Sao chép link" kèm cả thứ không ai quan tâm.
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    /**
     * Bộ lọc lấy từ query string chứ không nằm trong useState. Nhờ vậy URL
     * tự nó là bản sao của trạng thái: khách tìm kiếm rồi lọc, bấm vào một
     * sản phẩm, rồi bấm quay lại là thấy đúng danh sách và điều kiện lọc cũ,
     * và link cũng gửi cho ai khác xem được.
     */
    const selectedCategory = searchParams.get('category') ?? 'all';
    const selectedBrands = useMemo(
        () => (searchParams.get('brand') ?? '').split(',').filter(Boolean),
        [searchParams],
    );
    const searchQuery = searchParams.get('search') ?? '';
    const sortBy = searchParams.get('sort') ?? 'newest';
    const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

    // Khoảng giá mặc định trùng với đầu/cuối thanh trượt nên không ghi vào URL
    // cho tới khi khách thực sự kéo.
    const PRICE_MAX = 50000000;
    const priceRange = useMemo<[number, number]>(() => {
        const read = (key: string, fallback: number) => {
            const n = Number(searchParams.get(key));
            // Number('') là 0 nên phải kiểm tra rỗng trước, còn lỗi kiểu
            // Number('abc') = NaN thì rơi về mặc định.
            return searchParams.get(key) && Number.isFinite(n) ? n : fallback;
        };
        // Kẹp cả hai đầu vào trong tầm thanh trượt, và min không được vượt max
        // (URL do người dùng sửa tay có thể viết ngược) - nếu không Radix
        // Slider nhận [40tr, 10tr] sẽ vỡ và danh sách luôn rỗng.
        const min = Math.min(Math.max(0, read('min', 0)), PRICE_MAX);
        const max = Math.max(min, Math.min(PRICE_MAX, read('max', PRICE_MAX)));
        return [min, max];
    }, [searchParams]);

    /**
     * Ghi bộ lọc lên URL. Mặc định dùng replace để mỗi lần kéo thanh giá hay
     * gõ phím không nhồi một entry vào lịch sử trình duyệt - nếu không, khách
     * bấm nút "quay lại" sẽ phải ấn hàng chục lần mới thoát khỏi trang.
     * `push` chỉ dùng khi bấm sang trang khác (phân trang), vì đó mới là thao
     * tác khách thực sự muốn quay lại.
     */
    /**
     * Query string hiện tại, giữ trong ref và cập nhật NGAY trong lúc ghi.
     *
     * `useSearchParams()` chỉ trả giá trị mới ở lần render kế tiếp, còn nó là
     * giá trị của closure tại thời điểm effect được tạo. Nên nếu đọc thẳng
     * `searchParams` trong `writeUrl`, thao tác thứ hai sát thao tác thứ nhất sẽ
     * dựng URL từ bản cũ và xoá mất thay đổi vừa rồi: gõ "iphone" xong bấm
     * chọn hãng trong lúc debounce chưa nổ thì lựa chọn hãng biến mất. Ref
     * cập nhật đồng bộ giúp các lần ghi nối tiếp trên cùng một nền.
     */
    const paramsRef = useRef(searchParams.toString());

    const writeUrl = (patch: Record<string, string | null>, mode: 'replace' | 'push' = 'replace') => {
        const next = new URLSearchParams(paramsRef.current);
        for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
        }
        const qs = next.toString();
        // Cập nhật ref ngay, không đợi router xong. Nếu không, lần ghi kế tiếp
        // trước khi router render lại vẫn đọc bản cũ.
        paramsRef.current = qs;
        router[mode](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    /**
     * Đồng bộ `paramsRef` theo URL mới - nhưng CHỈ khi URL đổi theo hướng bên
     * ngoài (bấm Back/Forward, mở link chia sẻ).
     *
     * Không đồng bộ vô điều kiện sẽ phá đúng thứ vừa làm: hai lần ghi liên tiếp
     * (`?q=iphone` rồi `&sort=price-asc`) thì router trả về `searchParams` của
     * lần ghi TRƯỚC, effect ghi đè làm mất phần `sort` đã ghi. Nên chỉ chấp
     * nhận giá trị URL khi nó khác `paramsRef` - tức là không phải thứ chính
     * mình vừa ghi ra.
     */
    useEffect(() => {
        const fromUrl = searchParams.toString();
        if (fromUrl === paramsRef.current) return;
        // Chỉ nhận URL mới khi nó khác điều mình vừa ghi. Nhưng router có thể
        // trả về URL của lần ghi TRƯỚC khi hai lần ghi chạy sát nhau (chọn hãng
        // rồi đổi sắp xếp): nhận lùi ở đây sẽ làm mất thay đổi mới hơn, và
        // lần ghi sau đọc `paramsRef` sẽ không còn thấy nó.
        //
        // Cách phân biệt: URL của lần ghi trước luôn là TIỀN TỐ của URL mình
        // đang chờ (thêm `sort=...` không xoá `brand=...`). Nếu `paramsRef`
        // hiện tại bắt đầu bằng `fromUrl` thì đây là URL cũ hơn, bỏ qua.
        if (paramsRef.current.startsWith(fromUrl)) return;
        paramsRef.current = fromUrl;
    }, [searchParams]);

    /**
     * Bấm chọn (danh mục, hãng, sắp xếp, phân trang) dùng `push` để nút Back
     * của trình duyệt quay lại được trạng thái trước đó. Đã kiểm chứng: lọc
     * hãng -> mở sản phẩm -> bấm Back thì URL về `?brand=Samsung` và checkbox
     * vẫn tích.
     *
     * Gõ tìm kiếm và kéo giá dùng `replace` vì ghi liên tục; `push` mỗi lần
     * dừng sẽ nhồi entry và khách phải bấm Back nhiều lần mới thoát trang.
     */
    const setSelectedCategory = (id: string) =>
        writeUrl({ category: id === 'all' ? null : id, page: null }, 'push');
    const setSortBy = (v: string) => writeUrl({ sort: v === 'newest' ? null : v, page: null }, 'push');
    const setCurrentPage = (p: number) => writeUrl({ page: p === 1 ? null : String(p) }, 'push');

    /**
     * Checkbox hãng cần phản hồi tức thì, nên giữ lựa chọn ở state cục bộ rồi
     * mới ghi URL. Nếu để `checked` lấy thẳng từ `useSearchParams`, ô tích phải
     * đợi router xử lý xong mới đổi trạng thái (~60ms ở máy dev, lâu hơn nữa
     * trên máy khách) - trông như bấm không ăn, và nhiều khách sẽ bấm lần hai.
     */
    const [brandsDraft, setBrandsDraft] = useState<string[]>(selectedBrands);

    /**
     * Kéo `brandsDraft` về theo URL khi URL đổi mà state chưa khớp.
     *
     * So với `paramsRef` (URL mình vừa ghi ra) chứ không so với cờ "đang chờ":
     * cờ dễ bị lệc nhịp. Cụ thể là tick rồi bỏ chọn xong bấm Back - URL quay về
     * `?brand=Samsung` trong khi state đang là `[]`, đúng phải kéo về, nhưng
     * cờ thì vẫn còn giá trị lần ghi trước nên bị bỏ qua và checkbox không
     * tích lại. `paramsRef` luôn mô tả đúng URL hiện hành.
     */
    useEffect(() => {
        const fromUrl = new URLSearchParams(paramsRef.current).get('brand') ?? '';
        if (fromUrl === brandsDraft.join(',')) return; // đã đúng sẵn
        setBrandsDraft(fromUrl ? fromUrl.split(',') : []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBrands]);

    const setSelectedBrands = (next: string[]) => {
        setBrandsDraft(next);
        writeUrl({ brand: next.length ? next.join(',') : null, page: null }, 'push');
    };

    // Ô tìm kiếm và thanh giá giữ giá trị cục bộ rồi mới hoãn 400ms mới ghi
    // URL. Ghi mỗi ký tự sẽ tạo ra hàng chục lần re-render, và mỗi lần lại
    // lấy `searchParams` mới - mà `searchParams` lại là nguồn của chính ô
    // nhập, nên con trỏ nhảy và chữ bị mất.
    //
    // Khởi tạo thẳng từ URL chứ không để rỗng: mở `/products?q=macbook` thì ô
    // nhập phải có sẵn "macbook" ngay lần render đầu. Để rỗng rồi đợi effect
    // điền lại sẽ thấy URL đã khớp với state rỗng-sẵn nên bỏ qua, và ô nhập
    // trống hoàn toàn dù URL có từ khoá.
    const [searchInput, setSearchInput] = useState(searchQuery);
    const [priceDraft, setPriceDraft] = useState<[number, number]>(priceRange);

    // Kéo thanh giá: chỉ cập nhật ô nhập tay, URL để sau.
    const setPriceRange = (range: [number, number]) => setPriceDraft(range);

    /**
     * Kéo ô nhập và thanh giá về theo URL.
     *
     * Chỉ kéo khi URL thật sự khác những gì mình vừa ghi lên nó (`paramsRef`).
     * Đây là chỗ chống lỗi "gõ mất chữ": gõ "sam", dừng 400ms cho debounce ghi
     * `?search=sam`, rồi gõ tiếp "sung" trong lúc router còn đang xử lý. Router
     * trả `searchQuery = "sam"` đúng lúc đó; nếu kéo state về theo nó thì "sung"
     * bị xoá. Vì `paramsRef` đã là "samsung" nên URL "sam" bị coi là cũ hơn và
     * bỏ qua.
     *
     * Còn khi khách bấm Back thì `paramsRef` được effect ở trên cập nhật theo
     * URL thật, nên nó khác state và state được kéo về đúng.
     */
    useEffect(() => {
        const fromUrl = new URLSearchParams(paramsRef.current).get('search') ?? '';
        if (fromUrl === searchInput) return;
        setSearchInput(fromUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    useEffect(() => {
        // Dùng `priceRange` (đã kẹp min <= max) chứ không đọc thẳng từ URL:
        // link viết tay `?min=40000000&max=10000000` nếu đưa nguyên si vào
        // Radix Slider sẽ vỡ, và điều kiện giá luôn sai nên ra 0 sản phẩm.
        if (`${priceRange[0]}-${priceRange[1]}` === `${priceDraft[0]}-${priceDraft[1]}`) return;
        setPriceDraft(priceRange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [priceRange]);

    useEffect(() => {
        const t = setTimeout(() => {
            const q = searchInput.trim();
            // So với giá trị đang có trên URL chứ không phải `searchQuery` của
            // render này (đã cũ sau một lần ghi khác), nếu không timer cũ có
            // thể ghi đè một thay đổi mới hơn.
            if (q !== (new URLSearchParams(paramsRef.current).get('search') ?? '')) {
                // `replace` chứ không phải `push`: gõ là thao tác liên tục, push
                // mỗi lần dừng sẽ nhồi entry và khách phải bấm Back nhiều lần
                // mới thoát trang. Từ khoá vẫn quay lại được vì nó nằm trong
                // các tham số khác mà bấm bằng (danh mục, hãng, trang) đã push.
                writeUrl({ search: q || null, page: null });
            }
        }, 400);
        return () => clearTimeout(t);
        // writeUrl dùng ref nên không cần đưa vào deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    useEffect(() => {
        const t = setTimeout(() => {
            const current = new URLSearchParams(paramsRef.current);
            const min = current.get('min') ?? '0';
            const max = current.get('max') ?? String(PRICE_MAX);
            if (String(priceDraft[0]) === min && String(priceDraft[1]) === max) return;
            writeUrl({
                min: priceDraft[0] > 0 ? String(priceDraft[0]) : null,
                max: priceDraft[1] < PRICE_MAX ? String(priceDraft[1]) : null,
                page: null,
            });
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [priceDraft]);

    // Danh mục chỉ cần tải một lần
    useEffect(() => {
        fetchCategoriesList()
            .then((data) => setCategories(data || []))
            .catch(() => toast.error('Không thể tải danh mục'));
    }, []);

    // Ô tìm kiếm và thanh giá nằm ở URL phải đồng bộ về ô nhập. Đây chính là
    // lúc khách quay lại trang (bấm nút Back hoặc bấm link được chia sẻ): giá
    // trị cũ nằm trong URL nên điền lại được, thay vì trống trơn như trước.
    //
    // CHỈ kéo về theo URL khi URL đổi theo hướng bên ngoài. Nếu đồng bộ vô
    // điều kiện thì đây chính là lỗi "gõ mất chữ": gõ "sam" dừng 400ms, router
    // ghi `q=sam`; khách gõ tiếp "sung" trong lúc router còn xử lý, effect
    // chạy và đè ô nhập về "sam", nuốt mất "sung".
    // Danh sách hãng đếm theo danh mục + từ khoá đang chọn, đổi 2 điều kiện đó là tải lại
    useEffect(() => {
        let cancelled = false;
        fetchBrands({
            search: searchQuery.trim() || undefined,
            categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        })
            .then((data) => { if (!cancelled) setBrands(data || []); })
            .catch(() => { if (!cancelled) setBrands([]); });
        return () => { cancelled = true; };
    }, [searchQuery, selectedCategory]);

    // Trước đây đổi bộ lọc phải reset về trang 1 bằng useEffect. Nay mọi
    // setState của bộ lọc đã xoá `page` ngay trong lúc ghi URL nên không cần.

    const toggleBrand = (brand: string) => {
        // Tính trên `brandsDraft` của lần render hiện tại rồi bấm hai hãng
        // liên tiếp sẽ mất hãng đầu (lần render sau chưa kịp chạy). Dùng
        // `paramsRef` - nó được cập nhật đồng bộ ngay trong `writeUrl` nên
        // luôn mô tả đúng những gì khách đang chọn.
        const current = (new URLSearchParams(paramsRef.current).get('brand') ?? '').split(',').filter(Boolean);
        setSelectedBrands(
            current.includes(brand) ? current.filter((b) => b !== brand) : [...current, brand],
        );
    };

    // Lấy đúng một trang từ server, kèm toàn bộ điều kiện lọc
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const page = await fetchProductsPaged({
                page: currentPage,
                limit: itemsPerPage,
                search: searchQuery.trim() || undefined,
                categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
                brand: brandsDraft.length ? brandsDraft : undefined,
                minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
                maxPrice: priceRange[1] < PRICE_MAX ? priceRange[1] : undefined,
                sort: sortBy,
            });
            // Bỏ qua kết quả của request đã cũ để không ghi đè lên request mới hơn
            if (cancelled) return;
            setProducts(page.products);
            setTotalItems(page.total);
            setTotalPages(page.totalPages);
            // Link cũ hoặc URL gõ tay có thể trỏ tới trang không tồn tại
            // (bộ lọc đã đổi, kho đã cạn hàng). Kéo về trang cuối thật sự
            // thay vì để khách nhìn một trang trống không lối ra.
            if (page.totalPages > 0 && currentPage > page.totalPages) {
                // replace chứ không push: push sẽ nhồi thêm entry vào lịch sử
                // mỗi lần tải, bấm Back lại quay về `?page=10` cũ rồi lại bị
                // đẩy đi - mắc vòng lặp không ra khỏi trang.
                writeUrl({ page: page.totalPages === 1 ? null : String(page.totalPages) });
                return;
            }
            setLoading(false);
        };
        load();
        return () => { cancelled = true; };
        // `brandsDraft` và `priceRange` là mảng tạo mới mỗi lần render, nên
        // deps phải so nội dung (join / từng phần tử) chứ không so tham chiếu,
        // nếu không mỗi lần bấm hãng sẽ gọi API hai lần và dính rate limit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, searchQuery, priceRange[0], priceRange[1], selectedCategory, brandsDraft.join(','), sortBy]);

    /**
     * Danh sách nút trang: luôn có trang 1 và trang cuối, kèm 2 trang bên cạnh
     * trang đang xem, các đoạn bị bỏ qua thay bằng dấu "…".
     *
     * Danh mục có vài nghìn sản phẩm nên hàng trăm trang. Kiểu cũ chỉ render 5
     * trang đầu, muốn tới trang cuối phải bấm "Sau" hàng trăm lần.
     */
    const pageNumbers: (number | 'gap')[] = useMemo(() => {
        if (totalPages <= 1) return [];
        const pages = new Set<number>([1, totalPages]);
        for (let p = currentPage - 2; p <= currentPage + 2; p++) {
            if (p >= 1 && p <= totalPages) pages.add(p);
        }
        const sorted = [...pages].sort((a, b) => a - b);
        const out: (number | 'gap')[] = [];
        let prev = 0;
        for (const page of sorted) {
            if (prev && page - prev > 1) out.push('gap');
            out.push(page);
            prev = page;
        }
        return out;
    }, [currentPage, totalPages]);

    const handleAddToCart = async (variantId: string, quantity: number) => {
        if (!user?.id) {
            router.push('/auth');
            return;
        }

        try {
            const response: any = await addToCart(user.id, variantId, quantity);
            if (response.success) {
                toast.success(response.message || 'Đã thêm sản phẩm vào giỏ hàng');
                
                // Cập nhật cartStore
                const product = products.find(p => p.variants?.some(v => v.id === variantId));
                if (product) {
                    const variant = product.variants?.find(v => v.id === variantId);
                    if (variant) {
                        cartStore.addItem({
                            id: parseInt(variantId),
                            name: product.name,
                            price: variant.price,
                            quantity: quantity,
                            imageUrl: product.images?.[0]?.url || ''
                        });
                    }
                }
            } else {
                toast.error(response.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
            toast.error('Có lỗi xảy ra khi thêm sản phẩm');
        }
    };

    const resetFilters = () => {
        // Xoá sạch query string. Các effect đồng bộ sẽ tự đưa ô nhập, thanh
        // giá và danh sách hãng về mặc định theo URL mới.
        setSearchInput('');
        setPriceDraft([0, PRICE_MAX]);
        setBrandsDraft([]);
        paramsRef.current = '';
        // push để nút Back quay lại được trạng thái trước khi xoá lọc.
        router.push(pathname, { scroll: false });
    };

    // Danh sách hãng dài (vài chục tới hàng trăm hãng), chỉ hiện 12 hãng đầu
    // rồi mới mở rộng, tránh một sidebar dài lê thê.
    const BRAND_COLLAPSED = 12;
    const [showAllBrands, setShowAllBrands] = useState(false);

    /**
     * Hãng đang chọn phải luôn hiện được, kể cả khi tìm kiếm/đổi danh mục làm
     * nó biến khỏi `brands` (count = 0). Nếu không, lựa chọn của khách biến
     * mất im lặng: gõ tìm kiếm không ra hãng đó rồi xoá tìm kiếm thì cũng mất
     * luôn, dù lúc nãy khách vừa bấm chọn.
     */
    const brandOptions: { brand: string; count: number }[] = useMemo(() => {
        // Server so khớp hãng không phân biệt hoa thường, còn `brands` trả về
        // tên chuẩn trong DB. Link gõ tay `?brand=apple` thì `brandsDraft` là
        // "apple" trong khi API trả "Apple" - nếu không gộp lại, sidebar hiện
        // hai dòng cho cùng một hãng. Khoá là dạng viết thường, giá trị giữ
        // tên chuẩn từ API để hiển thị.
        const known = new Map(brands.map((b) => [b.brand.toLowerCase(), { brand: b.brand, count: b.count }]));
        for (const b of brandsDraft) {
            const key = b.toLowerCase();
            if (!known.has(key)) known.set(key, { brand: b, count: 0 });
        }
        return [...known.values()].sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
    }, [brands, brandsDraft]);

    const visibleBrands = showAllBrands
        ? brandOptions
        : brandOptions.slice(0, BRAND_COLLAPSED);

    // totalPages/totalItems do server trả về; products đã đúng là trang hiện tại.
    const currentProducts = products;

    // KHÔNG đổi lại thành component (`const FilterPanel = () => ...`): hàm đó được
    // tạo mới ở mỗi lần render, React coi là component khác nên huỷ rồi dựng lại cả
    // cây con -> ô <Input> mất focus sau đúng 1 ký tự, không gõ nổi từ khoá nào.
    // Để là một biến JSX thì nó chỉ là element, React giữ nguyên DOM.
    const filterPanel = (
        <div className="space-y-6">
            {/* Search */}
            <div>
                <Label className="text-sm font-semibold mb-2 block">Tìm kiếm</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Tìm sản phẩm..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Category Filter */}
            <div>
                <Label className="text-sm font-semibold mb-3 block">Danh mục</Label>
                <div className="space-y-2">
                    <button
                        onClick={() => {
                            console.log('🔘 Selected: All categories');
                            setSelectedCategory('all');
                        }}
                        className={`w-full text-left px-4 py-2 rounded-xl transition-colors ${selectedCategory === 'all'
                                ? 'bg-[#fc4c00]/10 text-[#af3200] font-medium'
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                    >
                        Tất cả sản phẩm
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => {
                                console.log('🔘 Selected category:', category.name, '| ID:', category.id);
                                setSelectedCategory(category.id);
                            }}
                            className={`w-full text-left px-4 py-2 rounded-xl transition-colors ${selectedCategory === category.id
                                    ? 'bg-[#fc4c00]/10 text-[#af3200] font-medium'
                                    : 'hover:bg-slate-50 text-slate-600'
                                }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Brand Filter */}
            {brandOptions.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold">Hãng</Label>
                        {brandsDraft.length > 0 && (
                            <button
                                onClick={() => setSelectedBrands([])}
                                className="text-xs text-[#af3200] hover:underline"
                            >
                                Bỏ chọn
                            </button>
                        )}
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {visibleBrands.map(({ brand, count }) => {
                            // So khớp không phân biệt hoa thường cho khớp với
                            // cách server so sánh, nên `?brand=apple` vẫn tích
                            // đúng dòng "Apple" trong danh sách.
                            const checked = brandsDraft.some((b) => b.toLowerCase() === brand.toLowerCase());
                            return (
                                <label
                                    key={brand}
                                    className="flex items-center gap-2.5 px-1 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleBrand(brand)}
                                        className="w-4 h-4 rounded border-slate-300 text-[#fc4c00] focus:ring-[#fc4c00]/30 cursor-pointer"
                                    />
                                    <span className={`text-sm flex-1 truncate ${checked
                                        ? 'text-[#af3200] font-medium'
                                        : 'text-slate-600'}`}>
                                        {brand === 'other' ? 'Khác' : brand}
                                    </span>
                                    <span className="text-xs text-slate-400 tabular-nums">
                                        {count.toLocaleString('vi-VN')}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {brandOptions.length > BRAND_COLLAPSED && (
                        <button
                            onClick={() => setShowAllBrands((v) => !v)}
                            className="mt-2 text-xs font-medium text-[#af3200] hover:underline"
                        >
                            {showAllBrands
                                ? 'Thu gọn'
                                : `Xem tất cả ${brandOptions.length} hãng`}
                        </button>
                    )}
                </div>
            )}

            {/* Price Range */}
            <div>
                <Label className="text-sm font-semibold mb-3 block">Khoảng giá</Label>
                <div className="px-2">
                    <Slider
                        min={0}
                        max={50000000}
                        step={100000}
                        value={priceDraft}
                        onValueChange={(value) => setPriceDraft(value as [number, number])}
                        className="mb-4"
                    />
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>{(priceDraft[0] / 1000000).toFixed(1)}M</span>
                        <span>{(priceDraft[1] / 1000000).toFixed(1)}M</span>
                    </div>
                </div>
            </div>

            {/* Reset Button */}
            <Button variant="outline" onClick={resetFilters} className="w-full">
                <X className="w-4 h-4 mr-2" />
                Xóa bộ lọc
            </Button>
        </div>
    );

    return (
        <div className="py-8 dark:bg-gray-950">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">Tất cả sản phẩm</h1>
                    {/* <div> (Skeleton) không được nằm trong <p> - HTML không cho phép,
                        trình duyệt tự đóng thẻ <p> lại và gây hydration error. */}
                    <div className="text-slate-600 dark:text-gray-400">
                        {loading ? (
                            <Skeleton className="h-5 w-64 inline-block" />
                        ) : (
                            `Khám phá ${totalItems.toLocaleString('vi-VN')} sản phẩm chất lượng cao`
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Desktop Filters */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <SlidersHorizontal className="w-5 h-5 text-[#af3200] dark:text-[#ff571a]" />
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bộ lọc</h2>
                            </div>
                            {filterPanel}
                        </div>
                    </aside>

                    {/* Products Area */}
                    <div className="lg:col-span-3">
                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div className="flex items-center gap-2">
                                {/* Mobile Filter */}
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" className="lg:hidden">
                                            <Filter className="w-4 h-4 mr-2" />
                                            Lọc
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-80">
                                        <SheetHeader>
                                            <SheetTitle>Bộ lọc</SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-6">
                                            {filterPanel}
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                {/* View Mode Toggle */}
                                <div className="hidden sm:flex gap-1 border border-slate-200 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-xl ${viewMode === 'grid'
                                                ? 'bg-[#fc4c00]/10 text-[#af3200]'
                                                : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        <Grid3x3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-xl ${viewMode === 'list'
                                                ? 'bg-[#fc4c00]/10 text-[#af3200]'
                                                : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Sort */}
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Sắp xếp" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Mới nhất</SelectItem>
                                    <SelectItem value="price-asc">Giá thấp → cao</SelectItem>
                                    <SelectItem value="price-desc">Giá cao → thấp</SelectItem>
                                    <SelectItem value="name-asc">Tên A → Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Active Filters */}
                        {(selectedCategory !== 'all' || searchQuery || brandsDraft.length > 0
                            || priceDraft[0] > 0 || priceDraft[1] < PRICE_MAX) && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                {selectedCategory !== 'all' && (
                                    <Badge variant="secondary" className="px-3 py-1.5">
                                        {categories.find((c) => c.id === selectedCategory)?.name}
                                        <button
                                            onClick={() => setSelectedCategory('all')}
                                            className="ml-2 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                )}
                                {brandsDraft.length > 0 && (
                                    <Badge variant="secondary" className="px-3 py-1.5">
                                        Hãng: {brandsDraft.map((b) => (b === 'other' ? 'Khác' : b)).join(', ')}
                                        <button
                                            onClick={() => setSelectedBrands([])}
                                            className="ml-2 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                )}
                                {(priceDraft[0] > 0 || priceDraft[1] < PRICE_MAX) && (
                                    <Badge variant="secondary" className="px-3 py-1.5">
                                        {(priceDraft[0] / 1000000).toFixed(1)}M &ndash;{' '}
                                        {(priceDraft[1] / 1000000).toFixed(1)}M
                                        <button
                                            onClick={() => setPriceDraft([0, PRICE_MAX])}
                                            className="ml-2 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                )}
                                {searchQuery && (
                                    <Badge variant="secondary" className="px-3 py-1.5">
                                        Tìm kiếm: &ldquo;{searchQuery}&rdquo;
                                        <button
                                            onClick={() => {
                                                setSearchInput('');
                                                writeUrl({ search: null, page: null }, 'push');
                                            }}
                                            className="ml-2 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Loading */}
                        {loading && (
                            <ProductsGridSkeleton count={8} className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-6" />
                        )}

                        {/* No Results */}
                        {!loading && products.length === 0 && (
                            <div className="text-center py-20">
                                <div className="w-24 h-24 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Package className="w-12 h-12 text-slate-400 dark:text-gray-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    Không tìm thấy sản phẩm
                                </h3>
                                <p className="text-slate-600 dark:text-gray-400 mb-6">
                                    Thử điều chỉnh bộ lọc hoặc tìm kiếm khác
                                </p>
                                <Button onClick={resetFilters} variant="outline">
                                    Xóa bộ lọc
                                </Button>
                            </div>
                        )}

                        {/* Products Grid */}
                        {!loading && products.length > 0 && (
                            <>
                                <div
                                    className={
                                        viewMode === 'grid'
                                            ? 'grid grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-6'
                                            : 'space-y-4'
                                    }
                                >
                                    {currentProducts.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
                                        <Button
                                            variant="outline"
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Trước
                                        </Button>
                                        {pageNumbers.map((page, idx) =>
                                            page === 'gap' ? (
                                                <span key={`gap-${idx}`} className="px-2 text-muted-foreground select-none">
                                                    …
                                                </span>
                                            ) : (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? 'default' : 'outline'}
                                                    onClick={() => setCurrentPage(page as number)}
                                                    className={
                                                        currentPage === page
                                                            ? 'bg-[#fc4c00] hover:bg-[#af3200] text-white rounded-full shadow-md'
                                                            : ''
                                                    }
                                                >
                                                    {page}
                                                </Button>
                                            ),
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Sau
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
