import { LogoMark } from "@/components/Logo";

const MarkBox = ({ iconSize }: { iconSize: number }) => (
    <span
        className="shrink-0"
        style={{ width: iconSize + 16, height: iconSize + 16 }}
    >
        <LogoMark className="h-full w-full" />
    </span>
);

export const Logo = ({ className = "", iconSize = 24, textSize = "text-2xl" }: { className?: string, iconSize?: number, textSize?: string }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <MarkBox iconSize={iconSize} />
            <div className="flex flex-col">
                <span className={`${textSize} font-extrabold tracking-tight text-slate-900 leading-none`}>
                    Mega<span className="text-[#d94100]">Mart</span>
                </span>
                <span className="text-[0.65rem] font-medium text-slate-500 tracking-widest uppercase ml-0.5">
                    Điện máy chính hãng
                </span>
            </div>
        </div>
    );
};

export const LogoDark = ({ className = "", iconSize = 24, textSize = "text-2xl" }: { className?: string, iconSize?: number, textSize?: string }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <MarkBox iconSize={iconSize} />
            <div className="flex flex-col">
                <span className={`${textSize} font-extrabold tracking-tight text-white leading-none`}>
                    Mega<span className="text-orange-100">Mart</span>
                </span>
                <span className="text-[0.65rem] font-medium text-white/65 tracking-widest uppercase ml-0.5">
                    Điện máy chính hãng
                </span>
            </div>
        </div>
    );
};
