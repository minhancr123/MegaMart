import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

interface TechSpecItem {
    label: string;
    value: string;
}

interface TechSpecsProps {
    specs?: TechSpecItem[];
}

// Mock data if no specs provided
const defaultSpecs = [
    { label: "Màn hình", value: "6.7 inch, Super Retina XDR OLED, 2796 x 1290 Pixels" },
    { label: "Camera sau", value: "48.0 MP + 12.0 MP + 12.0 MP" },
    { label: "Camera Selfie", value: "12.0 MP" },
    { label: "RAM", value: "8 GB" },
    { label: "Bộ nhớ trong", value: "256 GB" },
    { label: "CPU", value: "Apple A17 Pro" },
    { label: "GPU", value: "Apple GPU 6 nhân" },
    { label: "Dung lượng pin", value: "4422 mAh" },
    { label: "Thẻ sim", value: "1 Nano SIM & 1 eSIM" },
    { label: "Hệ điều hành", value: "iOS 17" },
    { label: "Xuất xứ", value: "Trung Quốc" },
    { label: "Thời gian ra mắt", value: "09/2023" },
];

export function TechSpecs({ specs = defaultSpecs }: TechSpecsProps) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Thông số kỹ thuật</h3>
            </div>
            <div className="p-0">
                <Table>
                    <TableBody>
                        {specs.map((spec, index) => (
                            <TableRow key={index} className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/50"}>
                                <TableCell className="font-medium text-gray-600 dark:text-gray-400 w-1/3 py-3">{spec.label}</TableCell>
                                <TableCell className="text-gray-900 dark:text-white py-3">{spec.value}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="p-3 text-center border-t border-gray-100 dark:border-gray-800">
                <button className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:underline">
                    Xem cấu hình chi tiết
                </button>
            </div>
        </div>
    );
}
