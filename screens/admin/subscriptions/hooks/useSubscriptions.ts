import { type Subscription } from '@/services/subscription';
import { useEffect, useState } from 'react';
function useDebounce<T>(value : T , delay: number){
    const[v , setV] = useState(value);
    // const t = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() =>{
        // if(t.current) clearTimeout(t.current);
        const timer = setTimeout(() => setV(value), delay);
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);
    return v;
}

export function useSubscriptions(){
    const [loading, setLoading] = useState(false);
    const [items , setItems] = useState<Subscription[]>([]);
    const [status, setStatus] = useState <'all' | Subscription['status']>('all');
    const [uidQuery, setUidQuery] = useState('');
    
    const debouncedUid = useDebounce(uidQuery, 350);

    const reload = async() =>{
        try{
            setLoading(true);
            const data = await listSubscriptions({
                uid: debouncedUid || undefined,
                status: status === 'all' ? undefined : status,
                limitN : 100,
            });
            setItems(data);

        }
        catch(e){
            console.error('Failed to load subscriptions', e);
        }
        finally{
            setLoading(false);
        }
    };
    useEffect(() =>{ reload();},[]);
    useEffect(() =>{ reload();},[status, debouncedUid]);
    
    return{ loading, items, status, setStatus, uidQuery, setUidQuery, reload };
}