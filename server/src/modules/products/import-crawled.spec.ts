import { extractModelCodes } from '../../../prisma/import-crawled';

describe('extractModelCodes (chặn trùng SP đa nguồn)', () => {
  it('tách đúng mã model alnum vừa chữ vừa số và khớp giữa 2 nguồn', () => {
    const nguyenKim = extractModelCodes('Samsung Loa Thanh HW-S700D');
    const choLon = extractModelCodes('DMCL-LOA-THANH-SAMSUNG-HWS700D');
    expect(nguyenKim).toContain('HWS700D');
    expect(choLon).toContain('HWS700D');

    // Cùng chứa mã chung HWS700D để merge
    const common = nguyenKim.filter((c) => choLon.includes(c));
    expect(common).toContain('HWS700D');

    expect(extractModelCodes('Tủ lạnh Sharp Inverter 197 lít SJ-X215V-DG')).toContain(
      'SJX215VDG',
    );
    expect(extractModelCodes('Máy lọc nước Mutosi 8 lõi MP-280S')).toContain(
      'MP280S',
    );
  });

  it('bỏ qua từ ngắn, đơn vị đo lường và từ khóa nhiễu chung', () => {
    expect(extractModelCodes('Tivi LG OLED 55 inch 2024')).toEqual([]);
    expect(extractModelCodes('Tivi 4K-Ultra HD Google TV 55INCH 100KG')).toEqual([]);
    expect(extractModelCodes('INVERTER 100KG')).toEqual([]);
  });
});
