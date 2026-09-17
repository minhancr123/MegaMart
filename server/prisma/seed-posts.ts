import { PostStatus, PostType, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

type SamplePost = {
  title: string;
  slug: string;
  excerpt: string;
  thumbnail: string;
  type: PostType;
  publishedAt: Date;
  tags: string[];
  content: string;
};

const samplePosts: SamplePost[] = [
  {
    title: 'Nên mua máy lạnh Inverter bao nhiêu HP cho từng diện tích phòng để tiết kiệm điện nhất?',
    slug: 'chon-may-lanh-inverter-bao-nhieu-hp-theo-dien-tich-phong',
    excerpt: 'Cách chọn đúng công suất máy lạnh theo diện tích, hướng nắng và số người sử dụng để làm mát nhanh mà không lãng phí điện.',
    thumbnail: '/images/stitch/promo-air-conditioner.jpg',
    type: PostType.NEWS,
    publishedAt: new Date('2026-09-08T08:00:00+07:00'),
    tags: ['Hướng dẫn mua', 'Máy lạnh', 'Tiết kiệm điện'],
    content: `
      <p>Chọn máy lạnh không chỉ dựa vào giá bán hay thương hiệu. Công suất phải phù hợp với diện tích phòng, mức độ cách nhiệt, hướng nắng và số người thường xuyên sử dụng.</p>
      <h2>Công thức chọn công suất chuẩn</h2>
      <p>Với phòng ở thông thường, bạn có thể ước tính khoảng <strong>600 BTU cho mỗi mét vuông</strong>. Phòng có cửa kính lớn, nằm ở tầng cao hoặc đón nắng chiều nên cộng thêm 10–20% công suất.</p>
      <table><thead><tr><th>Diện tích phòng</th><th>Công suất phù hợp</th><th>Gợi ý sử dụng</th></tr></thead><tbody><tr><td>Dưới 15 m²</td><td>1 HP — 9.000 BTU</td><td>Phòng ngủ, phòng làm việc nhỏ</td></tr><tr><td>15–20 m²</td><td>1.5 HP — 12.000 BTU</td><td>Phòng ngủ lớn, phòng khách nhỏ</td></tr><tr><td>20–30 m²</td><td>2 HP — 18.000 BTU</td><td>Phòng khách, văn phòng</td></tr><tr><td>30–40 m²</td><td>2.5 HP — 24.000 BTU</td><td>Không gian sinh hoạt lớn</td></tr></tbody></table>
      <h2>Mẹo nhỏ khi lắp đặt</h2>
      <p>Không đặt dàn lạnh đối diện trực tiếp giường ngủ, tránh vật cản trước luồng gió và vệ sinh lưới lọc mỗi 2–4 tuần. Đặt nhiệt độ 26–27°C kết hợp quạt gió thường cho cảm giác dễ chịu và tiết kiệm điện hơn.</p>
      <h2>Các mẫu đáng tham khảo</h2>
      <p>Daikin phù hợp người ưu tiên độ bền và vận hành êm; Panasonic nổi bật với công nghệ lọc khí; LG và Aqua có nhiều lựa chọn dễ tiếp cận trong tầm giá phổ thông.</p>
    `,
  },
  {
    title: 'Cách bảo dưỡng robot hút bụi để duy trì lực hút mạnh mẽ như mới',
    slug: 'cach-bao-duong-robot-hut-bui-dung-cach',
    excerpt: 'Lịch vệ sinh chổi, hộp bụi, cảm biến và màng lọc giúp robot hoạt động ổn định, ít kẹt và bền pin hơn.',
    thumbnail: '/images/stitch/home-family.jpg',
    type: PostType.NEWS,
    publishedAt: new Date('2026-09-07T09:15:00+07:00'),
    tags: ['Mẹo sử dụng', 'Gia dụng', 'Robot hút bụi'],
    content: `
      <p>Robot hút bụi làm việc sát mặt sàn nên tóc, bụi mịn và sợi vải tích tụ rất nhanh. Một lịch chăm sóc ngắn nhưng đều đặn sẽ giúp máy giữ lực hút và di chuyển chính xác.</p>
      <h2>Lịch vệ sinh khuyến nghị</h2>
      <ul><li><strong>Sau 2–3 lần chạy:</strong> đổ hộp bụi, gỡ tóc khỏi chổi chính.</li><li><strong>Mỗi tuần:</strong> lau cảm biến chống rơi và bánh xe.</li><li><strong>Mỗi tháng:</strong> vệ sinh màng lọc theo hướng dẫn của hãng.</li><li><strong>Mỗi 6–12 tháng:</strong> kiểm tra chổi cạnh, màng lọc và pin.</li></ul>
      <h2>Ba lỗi nên tránh</h2>
      <p>Không lắp màng lọc khi còn ẩm, không dùng vật sắc để cạy tóc khỏi chổi và không đặt đế sạc sát cầu thang hoặc nơi nắng chiếu trực tiếp.</p>
    `,
  },
  {
    title: 'Xu hướng camera smartphone 2026: Cảm biến lớn và AI lên ngôi',
    slug: 'xu-huong-camera-smartphone-2026',
    excerpt: 'Điện thoại mới tập trung vào cảm biến lớn, zoom quang học và AI xử lý ảnh theo ngữ cảnh thay vì chỉ tăng số megapixel.',
    thumbnail: '/images/stitch/hero-mobile-appliances.jpg',
    type: PostType.NEWS,
    publishedAt: new Date('2026-09-06T10:30:00+07:00'),
    tags: ['Tin công nghệ', 'Điện thoại', 'Camera AI'],
    content: `
      <p>Cuộc đua camera trên smartphone đang chuyển từ thông số megapixel sang chất lượng cảm biến, ống kính và khả năng xử lý bằng AI.</p>
      <h2>Cảm biến lớn cải thiện điều gì?</h2>
      <p>Cảm biến lớn thu được nhiều ánh sáng hơn, giúp ảnh đêm sạch nhiễu, vùng sáng tối cân bằng và màu da tự nhiên hơn. Đây là nâng cấp dễ nhận thấy trong sử dụng thực tế.</p>
      <h2>AI hỗ trợ đúng lúc</h2>
      <p>AI thế hệ mới nhận diện chuyển động, tối ưu ảnh chân dung, loại bỏ vật thể và gợi ý góc chụp. Tuy vậy, thuật toán tốt cần giữ được màu sắc tự nhiên thay vì làm ảnh quá rực.</p>
      <h2>Nên ưu tiên gì khi mua?</h2>
      <p>Hãy xem ảnh mẫu ở điều kiện thiếu sáng, khả năng chống rung video và chất lượng camera tele. Một hệ camera cân bằng hữu ích hơn một camera chính có thông số rất cao nhưng thiếu ổn định.</p>
    `,
  },
  {
    title: 'Nên mua máy giặt cửa trên hay cửa trước? Phân tích ưu nhược điểm',
    slug: 'nen-mua-may-giat-cua-tren-hay-cua-truoc',
    excerpt: 'So sánh mức tiêu thụ nước, khả năng làm sạch, không gian lắp đặt và chi phí để chọn đúng loại máy giặt cho gia đình.',
    thumbnail: '/images/stitch/hero-appliances.jpg',
    type: PostType.NEWS,
    publishedAt: new Date('2026-09-05T14:00:00+07:00'),
    tags: ['Hướng dẫn mua', 'Máy giặt', 'Điện lạnh'],
    content: `
      <p>Máy giặt cửa trên dễ sử dụng và có giá đầu tư thấp, trong khi máy cửa trước thường tiết kiệm nước, giặt sạch sâu và bảo vệ sợi vải tốt hơn.</p>
      <h2>So sánh nhanh</h2>
      <table><thead><tr><th>Tiêu chí</th><th>Cửa trên</th><th>Cửa trước</th></tr></thead><tbody><tr><td>Không gian</td><td>Gọn chiều ngang</td><td>Cần khoảng mở cửa phía trước</td></tr><tr><td>Nước sử dụng</td><td>Nhiều hơn</td><td>Tiết kiệm hơn</td></tr><tr><td>Khả năng giặt</td><td>Phù hợp nhu cầu cơ bản</td><td>Tốt với vết bẩn và đồ mỏng</td></tr><tr><td>Giá bán</td><td>Dễ tiếp cận</td><td>Cao hơn</td></tr></tbody></table>
      <p>Gia đình 2–3 người có thể chọn 8–9 kg; gia đình 4–5 người nên cân nhắc 10–11 kg. Nếu thường giặt chăn mền, hãy chọn lồng giặt lớn hơn nhu cầu hằng ngày.</p>
    `,
  },
  {
    title: 'Top tai nghe chống ồn chủ động đáng mua nhất phân khúc phổ thông',
    slug: 'top-tai-nghe-chong-on-chu-dong-pho-thong',
    excerpt: 'Những tiêu chí quan trọng về chống ồn, độ thoải mái, micro và thời lượng pin trước khi chọn tai nghe ANC.',
    thumbnail: '/images/stitch/promo-audio.jpg',
    type: PostType.NEWS,
    publishedAt: new Date('2026-09-04T16:20:00+07:00'),
    tags: ['Review sản phẩm', 'Âm thanh', 'Tai nghe'],
    content: `
      <p>Tai nghe chống ồn chủ động không chỉ dành cho chuyến bay. Trong văn phòng, quán cà phê hoặc khi di chuyển, ANC giúp giảm tiếng ù nền và giữ âm lượng nghe ở mức an toàn hơn.</p>
      <h2>Bốn tiêu chí cần thử</h2>
      <ol><li>Độ thoải mái sau ít nhất 20 phút đeo.</li><li>Khả năng giảm tiếng động cơ và tiếng nói.</li><li>Chất lượng micro khi gọi ở nơi đông người.</li><li>Thời lượng pin thực tế khi bật ANC.</li></ol>
      <p>Nếu dùng nhiều thiết bị, hãy ưu tiên tai nghe có kết nối multipoint. Người thường tập luyện nên kiểm tra thêm chuẩn kháng nước và độ chắc của đệm tai.</p>
    `,
  },
  {
    title: 'Tivi OLED và QLED khác nhau thế nào? Chọn loại nào cho phòng khách',
    slug: 'so-sanh-tivi-oled-va-qled',
    excerpt: 'OLED nổi bật với màu đen sâu và góc nhìn rộng; QLED có độ sáng cao và nhiều lựa chọn kích thước cho phòng khách sáng.',
    thumbnail: '/images/stitch/promo-tv-lifestyle.jpg',
    type: PostType.NEWS,
    publishedAt: new Date('2026-09-03T11:00:00+07:00'),
    tags: ['Tin công nghệ', 'Tivi', 'OLED', 'QLED'],
    content: `
      <p>OLED và QLED đều có thể cho hình ảnh đẹp, nhưng cách tạo ánh sáng khác nhau dẫn tới thế mạnh riêng.</p>
      <h2>OLED: màu đen sâu, tương phản cao</h2>
      <p>Mỗi điểm ảnh OLED tự phát sáng và có thể tắt hoàn toàn. Nhờ đó cảnh phim tối có chiều sâu, góc nhìn rộng và phản hồi nhanh khi chơi game.</p>
      <h2>QLED: sáng rõ trong phòng nhiều ánh sáng</h2>
      <p>QLED sử dụng đèn nền kết hợp lớp chấm lượng tử, thường đạt độ sáng cao và có nhiều mức giá. Đây là lựa chọn hợp lý cho phòng khách có cửa sổ lớn.</p>
      <p>Hãy ưu tiên kích thước phù hợp khoảng cách xem, hệ điều hành dễ dùng và cổng HDMI 2.1 nếu bạn chơi game console thế hệ mới.</p>
    `,
  },
  {
    title: '5 sai lầm phổ biến khiến tủ lạnh hao điện và nhanh xuống cấp',
    slug: 'sai-lam-khien-tu-lanh-hao-dien',
    excerpt: 'Điều chỉnh vị trí, nhiệt độ và thói quen bảo quản thực phẩm để tủ lạnh vận hành hiệu quả hơn mỗi ngày.',
    thumbnail: '/images/stitch/forgot-shopping.jpg',
    type: PostType.NEWS,
    publishedAt: new Date('2026-09-02T08:45:00+07:00'),
    tags: ['Mẹo sử dụng', 'Tủ lạnh', 'Tiết kiệm điện'],
    content: `
      <p>Tủ lạnh hoạt động liên tục nên những thói quen nhỏ có thể tạo ra khác biệt đáng kể trên hóa đơn điện và tuổi thọ máy.</p>
      <h2>Các lỗi thường gặp</h2>
      <ul><li>Đặt tủ sát tường, không chừa khe tản nhiệt.</li><li>Cho món còn nóng vào tủ.</li><li>Nhồi thực phẩm quá kín, cản luồng khí lạnh.</li><li>Mở cửa lâu hoặc gioăng cửa bị hở.</li><li>Đặt nhiệt độ thấp hơn mức cần thiết.</li></ul>
      <p>Ngăn mát nên duy trì khoảng 3–5°C và ngăn đông khoảng -18°C. Vệ sinh dàn tản nhiệt, kiểm tra gioăng cửa định kỳ và phân loại thực phẩm trước khi mở tủ.</p>
    `,
  },
  {
    title: 'Đại tiệc điện máy MegaMart: Ưu đãi lắp đặt và giao hàng toàn quốc',
    slug: 'dai-tiec-dien-may-megamart-2026',
    excerpt: 'Chương trình ưu đãi cho tivi, máy lạnh, tủ lạnh, máy giặt và thiết bị gia dụng, kèm hỗ trợ giao lắp tận nơi.',
    thumbnail: '/images/stitch/auth-shopping.jpg',
    type: PostType.EVENT,
    publishedAt: new Date('2026-09-01T09:00:00+07:00'),
    tags: ['Khuyến mãi', 'Sự kiện', 'MegaMart'],
    content: `
      <p>Đại tiệc điện máy MegaMart mang đến nhiều lựa chọn cho nhu cầu nâng cấp thiết bị gia đình, từ tivi, máy lạnh đến đồ gia dụng nhỏ.</p>
      <h2>Quyền lợi nổi bật</h2>
      <ul><li>Giao hàng tận nơi theo khu vực áp dụng.</li><li>Hỗ trợ lắp đặt các sản phẩm điện lạnh.</li><li>Ưu đãi thanh toán và trả góp tùy ngân hàng.</li><li>Bảo hành chính hãng, thông tin minh bạch.</li></ul>
      <p>Số lượng sản phẩm ưu đãi có hạn và có thể thay đổi theo tồn kho. Khách hàng nên kiểm tra điều kiện áp dụng ngay tại trang sản phẩm trước khi đặt hàng.</p>
    `,
  },
];

async function main() {
  const author =
    (await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      orderBy: { createdAt: 'asc' },
    })) ?? (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));

  if (!author) {
    throw new Error('Không tìm thấy tài khoản tác giả. Hãy tạo ít nhất một user trước khi seed bài viết.');
  }

  for (const item of samplePosts) {
    const { tags, ...postData } = item;
    const post = await prisma.post.upsert({
      where: { slug: item.slug },
      update: {
        ...postData,
        authorId: author.id,
        status: PostStatus.PUBLISHED,
      },
      create: {
        ...postData,
        authorId: author.id,
        status: PostStatus.PUBLISHED,
      },
    });

    await prisma.postTag.deleteMany({ where: { postId: post.id } });
    for (const name of tags) {
      const slug = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const tag = await prisma.tag.upsert({
        where: { slug },
        update: { name },
        create: { name, slug },
      });
      await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
    }
  }

  console.log(`✅ Đã upsert ${samplePosts.length} bài viết mẫu cho tác giả ${author.email}.`);
}

main()
  .catch((error) => {
    console.error('❌ Seed bài viết thất bại:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
