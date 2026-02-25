'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { generateAndSendReport } from './actions';


export default function ReportButton() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    async function handleSendReport() {
        setIsLoading(true);
        const result = await generateAndSendReport();
        if (result.success) {
            toast({
                title: 'Inventory Report',
                description: result.message,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.message,
            });
        }
        setIsLoading(false);
    }

    return (
        <Button onClick={handleSendReport} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <AlertTriangle />}
            Generate & Send Alert Report
        </Button>
    )
}
