import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useDriverHubPosts } from '@/hooks/useDriverHubPosts';
import { useDeliveryAreas } from '@/hooks/useDeliveryAreas';
import { POST_TYPES } from './postTypes';
import { CreatePostDialog } from './CreatePostDialog';
import { PostCard } from './PostCard';
import { SosButton } from './SosButton';
import { SosPanel } from './SosPanel';
import { HeatMap } from './HeatMap';
import { Leaderboard } from './Leaderboard';
import { NetworkStats } from './NetworkStats';
import { PersonalNotesTab } from '../PersonalNotesTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Filter, Network, Loader2, BookOpen, Trophy, Activity } from 'lucide-react';

export function DriverHubTab() {
  const { user } = useAuth();
  const { role } = useRole();
  const { areas } = useDeliveryAreas();
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { posts, loading } = useDriverHubPosts(filterArea === 'all' ? null : filterArea);
  const filteredPosts = filterType === 'all' ? posts : posts.filter((p) => p.post_type === filterType);
  const isAdmin = role === 'admin' || role === 'field';

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          شبكة السائقين
        </h2>
        <SosButton />
      </div>

      {/* Active SOS alerts */}
      <SosPanel />

      {/* Tabs */}
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="feed" className="text-xs">
            <Activity className="w-4 h-4 ml-1" />
            التبليغات
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs">
            <Trophy className="w-4 h-4 ml-1" />
            الشرف
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            <BookOpen className="w-4 h-4 ml-1" />
            دفتري
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">
            📊 الشبكة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-3 mt-3">
          {/* Create post button */}
          <Button
            onClick={() => setCreateOpen(true)}
            variant="default"
            className="w-full h-12 text-base"
          >
            <Plus className="w-5 h-5 ml-2" />
            تبليغ جديد - شارك معلومة
          </Button>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="كل المناطق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المناطق</SelectItem>
                {areas.filter((a) => a.is_active).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="كل الأنواع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {POST_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.emoji} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Posts feed */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-bold">لا توجد تبليغات حالياً</p>
              <p className="text-xs mt-1">كن أول من يشارك معلومة مفيدة مع زملائك السائقين! 🌟</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((p) => (
                <PostCard key={p.id} post={p} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-3">
          <Leaderboard />
        </TabsContent>

        <TabsContent value="notes" className="mt-3">
          <PersonalNotesTab />
        </TabsContent>

        <TabsContent value="stats" className="mt-3 space-y-3">
          <NetworkStats />
          <HeatMap />
        </TabsContent>
      </Tabs>

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}