import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserReactions } from '@/hooks/useDriverHubReactions';
import { useDriverHubPosts, type DriverHubPost } from '@/hooks/useDriverHubPosts';
import { getPostTypeMeta } from './postTypes';
import { Button } from '@/components/ui/button';
import { ThumbsUp, AlertCircle, CheckCircle2, Trash2, Pin, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  post: DriverHubPost;
  isAdmin?: boolean;
}

export function PostCard({ post, isAdmin }: Props) {
  const { user } = useAuth();
  const meta = getPostTypeMeta(post.post_type);
  const Icon = meta.icon;
  const { hasReacted, toggleReaction } = useUserReactions(user?.id);
  const { deletePost, togglePin } = useDriverHubPosts();
  const [imageOpen, setImageOpen] = useState(false);

  const isOwner = post.user_id === user?.id;
  const userName = user?.fullName || user?.username || 'سائق';

  const handleReact = async (type: string) => {
    const r = await toggleReaction(post.id, type, userName);
    if (!r.success) toast.error('فشلت العملية');
  };

  const handleDelete = async () => {
    if (!confirm('حذف هذا التبليغ؟')) return;
    const r = await deletePost(post.id);
    if (r.success) toast.success('تم الحذف');
  };

  const handlePin = async () => {
    await togglePin(post.id, post.is_pinned);
    toast.success(post.is_pinned ? 'تم إلغاء التثبيت' : 'تم تثبيت التبليغ');
  };

  const expiresIn = post.expires_at ? new Date(post.expires_at).getTime() - Date.now() : 0;
  const expiresMinutes = Math.max(0, Math.floor(expiresIn / 60000));

  return (
    <div className={`rounded-2xl border-2 ${meta.borderColor} ${meta.bgColor} p-3 shadow-soft transition-all ${post.is_pinned ? 'ring-2 ring-primary/40' : ''} ${post.is_resolved ? 'opacity-60' : ''}`}>
      {post.is_pinned && (
        <div className="flex items-center gap-1 text-primary text-xs font-bold mb-2">
          <Pin className="w-3 h-3 fill-current" />
          مثبّت
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-card`}>
          {meta.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <p className={`font-bold text-sm ${meta.color}`}>{meta.label}</p>
              <p className="text-xs text-muted-foreground">
                {post.user_name} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ar })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {(isAdmin || isOwner) && (
                <button onClick={handlePin} className="p-1 text-muted-foreground hover:text-primary" aria-label="تثبيت">
                  <Pin className={`w-4 h-4 ${post.is_pinned ? 'fill-current text-primary' : ''}`} />
                </button>
              )}
              {(isOwner || isAdmin) && (
                <button onClick={handleDelete} className="p-1 text-destructive opacity-60 hover:opacity-100" aria-label="حذف">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">{post.content}</p>

          {post.image_url && (
            <>
              <button
                onClick={() => setImageOpen(true)}
                className="block w-full mb-2"
              >
                <img src={post.image_url} alt="صورة التبليغ" className="w-full max-h-64 object-cover rounded-xl" loading="lazy" />
              </button>
              {imageOpen && (
                <div
                  className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                  onClick={() => setImageOpen(false)}
                >
                  <img src={post.image_url} alt="صورة كاملة" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
            {post.delivery_area_name && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {post.delivery_area_name}
              </span>
            )}
            {post.expires_at && !post.is_resolved && expiresMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ينتهي خلال {expiresMinutes < 60 ? `${expiresMinutes} د` : `${Math.floor(expiresMinutes / 60)} س`}
              </span>
            )}
            {post.is_resolved && (
              <span className="flex items-center gap-1 text-success font-bold">
                <CheckCircle2 className="w-3 h-3" />
                تم الحل
              </span>
            )}
          </div>

          {!post.is_resolved && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant={hasReacted(post.id, 'thanks') ? 'default' : 'outline'}
                onClick={() => handleReact('thanks')}
                className="h-8 text-xs"
              >
                <ThumbsUp className="w-3 h-3 ml-1" />
                شكراً ({post.thanks_count})
              </Button>
              <Button
                size="sm"
                variant={hasReacted(post.id, 'still_there') ? 'warning' : 'outline'}
                onClick={() => handleReact('still_there')}
                className="h-8 text-xs"
              >
                <AlertCircle className="w-3 h-3 ml-1" />
                ما زال موجود ({post.still_there_count})
              </Button>
              {!isOwner && (
                <Button
                  size="sm"
                  variant={hasReacted(post.id, 'resolved') ? 'success' : 'outline'}
                  onClick={() => handleReact('resolved')}
                  className="h-8 text-xs"
                >
                  <CheckCircle2 className="w-3 h-3 ml-1" />
                  تم الحل
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}