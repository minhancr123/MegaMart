import { ShoppingBag } from "lucide-react";

export const Logo = ({ className = "", iconSize = 24, textSize = "text-2xl" }: { className?: string, iconSize?: number, textSize?: string }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-indigo-600 blur-sm opacity-50 rounded-lg"></div>
                <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 p-2 rounded-xl shadow-lg border border-white/10">
                    <ShoppingBag size={iconSize} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full border-2 border-slate-900"></div>
            </div>
            <div className="flex flex-col">
                <span className={`${textSize} font-extrabold tracking-tight text-slate-900 leading-none`}>
                    Mega<span className="text-indigo-600">Mart</span>
                </span>
                <span className="text-[0.65rem] font-medium text-slate-500 tracking-widest uppercase ml-0.5">
                    Premium Store
                </span>
            </div>
        </div>
    );
};

export const LogoDark = ({ className = "", iconSize = 24, textSize = "text-2xl" }: { className?: string, iconSize?: number, textSize?: string }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 rounded-lg"></div>
                <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg border border-white/20">
                    <ShoppingBag size={iconSize} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full border-2 border-slate-900"></div>
            </div>
            <div className="flex flex-col">
                <span className={`${textSize} font-extrabold tracking-tight text-white leading-none`}>
                    Mega<span className="text-indigo-400">Mart</span>
                </span>
                <span className="text-[0.65rem] font-medium text-slate-400 tracking-widest uppercase ml-0.5">
                    Premium Store
                </span>
            </div>
        </div>
    );
};
