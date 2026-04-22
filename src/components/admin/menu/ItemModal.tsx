import { useState, useEffect, useRef } from 'react';
import { MenuItem } from '@/hooks/useMenuItems';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit3, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadMenuImage } from '@/lib/uploadMenuImage';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: { name: string; price: number; image: string | null; category: string }) => Promise<void>;
  categories: string[];
  selectedCategory: string;
  editItem?: MenuItem | null;
}

export function ItemModal({ isOpen, onClose, onSave, categories, selectedCategory, editItem }: ItemModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(selectedCategory);
  const [newCategory, setNewCategory] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setName(editItem.name);
        setPrice(editItem.price.toString());
        setCategory(editItem.category);
        setImage(editItem.image);
      } else {
        setName('');
        setPrice('');
        setCategory(selectedCategory);
        setImage(null);
      }
      setNewCategory('');
    }
  }, [isOpen, selectedCategory, editItem]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMenuImage(file, editItem?.id);
      setImage(url);
      setUploading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل رفع الصورة';
      toast.error(msg);
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price) { toast.error('يرجى ملء جميع الحقول'); return; }
    const finalCategory = newCategory.trim() || category;
    if (!finalCategory) { toast.error('يرجى اختيار أو إدخال قسم'); return; }
    setLoading(true);
    try {
      await onSave({ name: name.trim(), price: Number(price), image, category: finalCategory });
      onClose();
    } catch {}
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              {editItem ? <Edit3 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            </div>
            {editItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            <button onClick={() => fileInputRef.current?.click()} className="w-32 h-32 rounded-2xl border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center bg-muted/30 overflow-hidden group">
              {uploading ? (
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              ) : image ? (
                <div className="relative w-full h-full">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">اضغط لرفع صورة</span>
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">اسم الصنف</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: برجر دجاج" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">السعر (د.ع)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">القسم</Label>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => { setCategory(cat); setNewCategory(''); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${category === cat && !newCategory ? 'bg-primary text-primary-foreground shadow-soft' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="أو أدخل قسم جديد..." className="h-11" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-11">إلغاء</Button>
          <Button onClick={handleSubmit} disabled={loading} className="h-11 min-w-[100px]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editItem ? 'حفظ التعديلات' : 'إضافة')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
