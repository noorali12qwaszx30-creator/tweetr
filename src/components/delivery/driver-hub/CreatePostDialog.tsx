import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDeliveryAreas } from '@/hooks/useDeliveryAreas';
import { useDriverHubPosts, uploadPostImage } from '@/hooks/useDriverHubPosts';
import { compressImage } from '@/lib/imageCompression';
import { POST_TYPES, getPostTypeMeta } from './postTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { areas } = useDeliveryAreas();
  const { createPost } = useDriverHubPosts();
  const [postType, setPostType] = useState('traffic');
  const [content, setContent] = useState('');
  const [areaId, setAreaId] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('يجب أن يكون الملف صورة');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (الحد الأقصى 10MB)');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setPostType('traffic');
    setContent('');
    setAreaId('');
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('اكتب وصفاً للتبليغ');
      return;
    }
    if (!user?.id) return;

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const compressed = await compressImage(imageFile);
        imageUrl = await uploadPostImage(compressed, user.id);
        if (!imageUrl) {
          toast.error('فشل رفع الصورة');
          setSubmitting(false);
          return;
        }
      }

      const meta = getPostTypeMeta(postType);
      const selectedArea = areas.find((a) => a.id === areaId);
      const result = await createPost({
        user_id: user.id,
        user_name: user.fullName || user.username || 'سائق',
        post_type: postType,
        content: content.trim(),
        image_url: imageUrl,
        delivery_area_id: areaId || null,
        delivery_area_name: selectedArea?.name || null,
        severity: meta.defaultSeverity,
      });

      if (result.success) {
        toast.success('تم نشر التبليغ بنجاح! +5 نقاط 🎉');
        reset();
        onOpenChange(false);
      } else {
        toast.error('فشل نشر التبليغ');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تبليغ جديد 📢</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">نوع التبليغ</Label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPostType(t.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                    postType === t.id ? `${t.bgColor} ${t.borderColor}` : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  <span className="text-xl">{t.emoji}</span>
                  <span className={`text-xs font-bold ${postType === t.id ? t.color : 'text-foreground'}`}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="content" className="mb-2 block">التفاصيل</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب تفاصيل التبليغ هنا (مثلاً: ازدحام شديد قرب جسر..)"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-end">{content.length}/500</p>
          </div>

          <div>
            <Label className="mb-2 block">المنطقة (اختياري)</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر منطقة" />
              </SelectTrigger>
              <SelectContent>
                {areas.filter(a => a.is_active).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">صورة (اختياري)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            {!imagePreview ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="h-20 flex-col"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs">كاميرا</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="h-20 flex-col"
                >
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-xs">معرض الصور</span>
                </Button>
              </div>
            ) : (
              <div className="relative">
                <img src={imagePreview} alt="معاينة" className="w-full max-h-48 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 left-2 bg-destructive text-destructive-foreground p-1 rounded-full"
                  aria-label="إزالة الصورة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            نشر التبليغ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}