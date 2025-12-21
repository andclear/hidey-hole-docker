
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AIAnalysisStatusProps {
    status: "pending" | "processing" | "completed" | "failed";
    error?: string;
}

export function AIAnalysisStatus({ status, error }: AIAnalysisStatusProps) {
    if (status === "pending") {
        return (
            <Badge variant="outline" className="gap-1 bg-muted">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">排队中...</span>
            </Badge>
        );
    }
    
    if (status === "processing") {
        return (
            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>分析中...</span>
            </Badge>
        );
    }

    if (status === "completed") {
        return (
            <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
                <Check className="h-3 w-3" />
                <span>完成</span>
            </Badge>
        );
    }

    if (status === "failed") {
        return (
            <Badge variant="destructive" className="gap-1" title={error}>
                <AlertCircle className="h-3 w-3" />
                <span>失败</span>
            </Badge>
        );
    }

    return null;
}
