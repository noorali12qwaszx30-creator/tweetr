import { useState, useEffect, useRef } from 'react';
import { MenuItem } from '@/hooks/useMenuItems';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadMenuImage, deleteMenuImageIfManaged } from '@/lib/uploadMenuImage';

interface ImageUpdateModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, image: string) => Promise<void>;
}

export function ImageUpdateModal({ item, isOpen, onClose, onUpdate }: ImageUpdateModalProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => fileInputRef.current?.click(), 100);
  }, [isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;
    setUploading(true);
    try {
      const url = await uploadMenuImage(file, item.id);
      // Best-effort cleanup of the previous image if it lives in our bucket
      await deleteMenuImageIfManaged(item.image);
      await onUpdate(item.id, url);
      setUploading(false);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث الصورة';
      toast.error(msg);
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">تحديث صورة {item?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {uploading ? (
            <div className="py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-4 text-center">جاري الرفع...</p>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-10 border-2 border-dashed border-border rounded-2xl hover:border-primary transition-colors bg-muted/30">
              <ImageIcon className="w-14 h-14 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">اضغط لاختيار صورة جديدة</p>
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
