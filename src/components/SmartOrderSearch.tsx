import { useState, useMemo, useEffect, useCallback } from 'react';
import { OrderWithItems, DbOrderItem } from '@/hooks/useSupabaseOrders';
import { OrderCard } from './OrderCard';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';
import {
  Search,
  X,
  Clock,
  Filter,
  Zap,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  Timer,
  Package,
} from 'lucide-react';

// --- Fuzzy matching helpers ---
const ARABIC_TYPO_MAP: Record<string, string[]> = {
  'بركر': ['برجر', 'برقر'],
  'بيبسي': ['ببسي', 'بيبسى'],
  'لحم': ['لحمة', 'لحوم'],
  'دجاج': ['جاج', 'دياج', 'جكن'],
  'جكن': ['دجاج', 'تشكن'],
};

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .trim()
    .toLowerCase();
}

function fuzzyMatch(text: string, query: string): boolean {
  const normText = normalizeArabic(text);
  const normQuery = normalizeArabic(query);
  if (normText.includes(normQuery)) return true;

  // Check typo map
  for (const [typo, corrections] of Object.entries(ARABIC_TYPO_MAP)) {
    if (normalizeArabic(typo).includes(normQuery) || normQuery.includes(normalizeArabic(typo))) {
      for (const c of corrections) {
        if (normText.includes(normalizeArabic(c))) return true;
      }
    }
    for (const c of corrections) {
      if (normalizeArabic(c).includes(normQuery) || normQuery.includes(normalizeArabic(c))) {
        if (normText.includes(normalizeArabic(typo))) return true;
      }
    }
  }

  // Simple character distance for short queries
  if (normQuery.length >= 3 && normQuery.length <= 6) {
    // Check if most characters match
    let matches = 0;
    for (const ch of normQuery) {
      if (normText.includes(ch)) matches++;
    }
    if (matches / normQuery.length >= 0.7) return true;
  }

  return false;
}

const ORDER_SOURCE_LABELS: Record<string, string> = {
  instagram: 'انستقرام',
  telegram: 'تلكرام',
  phone: 'هاتف',
  whatsapp: 'واتساب',
  local: 'محلي',
};

type StatusFilter = 'all' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled' | 'pending';
type TimeFilter = 'all' | '10min' | '1hour' | 'today';

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'الكل', icon: <Package className="w-3 h-3" />, color: 'bg-muted text-foreground' },
  { value: 'pending', label: 'معلق', icon: <Clock className="w-3 h-3" />, color: 'bg-warning/20 text-warning' },
  { value: 'preparing', label: 'قيد التحضير', icon: <ChefHat className="w-3 h-3" />, color: 'bg-info/20 text-info' },
  { value: 'ready', label: 'جاهز', icon: <CheckCircle className="w-3 h-3" />, color: 'bg-success/20 text-success' },
  { value: 'delivering', label: 'قيد التوصيل', icon: <Truck className="w-3 h-3" />, color: 'bg-primary/20 text-primary' },
  { value: 'delivered', label: 'مكتمل', icon: <CheckCircle className="w-3 h-3" />, color: 'bg-success/20 text-success' },
  { value: 'cancelled', label: 'ملغي', icon: <XCircle className="w-3 h-3" />, color: 'bg-destructive/20 text-destructive' },
];

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: '10min', label: 'آخر 10 دقائق' },
  { value: '1hour', label: 'آخر ساعة' },
  { value: 'today', label: 'اليوم' },
];

interface SmartOrderSearchProps {
  orders: OrderWithItems[];
  onEditOrder: (order: OrderWithItems) => void;
  onCancelOrder: (order: OrderWithItems) => void;
}

const RECENT_SEARCHES_KEY = 'cashier_recent_searches';
const MAX_RECENT = 5;

function loadRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch { return []; }
}

function saveRecentSearch(query: string) {
  const recent = loadRecentSearches().filter(s => s !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function SmartOrderSearch({ orders, onEditOrder, onCancelOrder }: SmartOrderSearchProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);

  // Save search on blur or enter
  const commitSearch = useCallback(() => {
    if (query.trim().length >= 2) {
      saveRecentSearch(query.trim());
      setRecentSearches(loadRecentSearches());
    }
  }, [query]);

  const filteredOrders = useMemo(() => {
    let results = [...orders];

    // Time filter
    if (timeFilter !== 'all') {
      const now = Date.now();
      const cutoff = timeFilter === '10min' ? 10 * 60 * 1000
        : timeFilter === '1hour' ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
      results = results.filter(o => now - new Date(o.created_at).getTime() < cutoff);
    }

    // Status filter
    if (statusFilter !== 'all') {
      results = results.filter(o => o.status === statusFilter);
    }

    // Search query
    if (query.trim()) {
      const q = query.trim();
      const englishQ = toEnglishNumbers(q);

      results = results.filter(order => {
        // Order number
        if (String(order.order_number).includes(englishQ)) return true;
        // Customer name
        if (fuzzyMatch(order.customer_name, q)) return true;
        // Phone
        if (order.customer_phone && toEnglishNumbers(order.customer_phone).includes(englishQ)) return true;
        // Delivery person
        if (order.delivery_person_name && fuzzyMatch(order.delivery_person_name, q)) return true;
        // Address
        if (order.customer_address && fuzzyMatch(order.customer_address, q)) return true;
        // Order source
        if (order.order_source) {
          const srcLabel = ORDER_SOURCE_LABELS[order.order_source] || order.order_source;
          if (fuzzyMatch(srcLabel, q) || fuzzyMatch(order.order_source, q)) return true;
        }
        // Items content
        if (order.items.some((item: DbOrderItem) => fuzzyMatch(item.menu_item_name, q))) return true;
        // Notes
        if (order.notes && fuzzyMatch(order.notes, q)) return true;
        if (order.items.some((item: DbOrderItem) => item.notes && fuzzyMatch(item.notes, q))) return true;

        return false;
      });

      // Sort: active statuses first, then by relevance (exact order number match first), then by date
      results.sort((a, b) => {
        const activeStatuses = ['pending', 'preparing', 'ready', 'delivering'];
        const aActive = activeStatuses.includes(a.status) ? 0 : 1;
        const bActive = activeStatuses.includes(b.status) ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;

        // Exact order number match
        const aExact = String(a.order_number) === englishQ ? 0 : 1;
        const bExact = String(b.order_number) === englishQ ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return results;
  }, [orders, query, statusFilter, timeFilter]);

  // Quick access: recent & active orders
  const activeOrders = useMemo(() =>
    orders.filter(o => ['preparing', 'ready', 'delivering'].includes(o.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5),
    [orders]
  );

  const recentOrders = useMemo(() =>
    [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [orders]
  );

  const showQuickAccess = !query.trim() && statusFilter === 'all' && timeFilter === 'all';

  const handleOrderClick = (order: OrderWithItems) => {
    setSelectedOrder(order);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="ابحث برقم الطلب، اسم الزبون، الهاتف، المحتوى..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={commitSearch}
          onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
          className="pr-10 pl-10 h-12 text-base rounded-xl border-2 border-primary/30 focus:border-primary"
          dir="rtl"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filter Toggle & Quick Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="h-8 text-xs gap-1"
        >
          <Filter className="w-3 h-3" />
          فلاتر
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setQuery(''); setStatusFilter('all'); setTimeFilter('10min'); }}
          className="h-8 text-xs gap-1"
        >
          <Timer className="w-3 h-3" />
          آخر 10 دقائق
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setQuery(''); setStatusFilter('preparing'); setTimeFilter('all'); }}
          className="h-8 text-xs gap-1"
        >
          <Zap className="w-3 h-3" />
          قيد التحضير
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setQuery(''); setStatusFilter('ready'); setTimeFilter('all'); }}
          className="h-8 text-xs gap-1 text-success"
        >
          <CheckCircle className="w-3 h-3" />
          جاهز
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Status Filters */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">الحالة</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map(sf => (
                <button
                  key={sf.value}
                  onClick={() => setStatusFilter(sf.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    statusFilter === sf.value
                      ? `${sf.color} ring-2 ring-offset-1 ring-current`
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {sf.icon}
                  {sf.label}
                </button>
              ))}
            </div>
          </div>
          {/* Time Filters */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">الفترة الزمنية</p>
            <div className="flex flex-wrap gap-1.5">
              {TIME_FILTERS.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeFilter(tf.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    timeFilter === tf.value
                      ? 'bg-primary/20 text-primary ring-2 ring-offset-1 ring-primary'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStatusFilter('all'); setTimeFilter('all'); }}
            className="text-xs text-muted-foreground"
          >
            إعادة تعيين الفلاتر
          </Button>
        </div>
      )}

      {/* Recent Searches */}
      {showQuickAccess && recentSearches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <History className="w-3 h-3" />
            عمليات البحث الأخيرة
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((s, i) => (
              <button
                key={i}
                onClick={() => setQuery(s)}
                className="px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access: Active Orders */}
      {showQuickAccess && activeOrders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3 text-warning" />
            طلبات جارية الآن
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeOrders.map(order => (
              <button
                key={order.id}
                onClick={() => handleOrderClick(order)}
                className="flex-shrink-0 bg-card border border-border rounded-lg p-2 min-w-[120px] text-right hover:border-primary/50 transition-colors"
              >
                <p className="font-bold text-primary text-sm">{toEnglishNumbers(order.order_number)}</p>
                <p className="text-xs truncate">{order.customer_name}</p>
                <Badge variant="outline" className="text-[10px] mt-1">
                  {order.status === 'preparing' ? 'تحضير' : order.status === 'ready' ? 'جاهز' : 'توصيل'}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!showQuickAccess && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredOrders.length > 0
                ? `${toEnglishNumbers(filteredOrders.length)} نتيجة`
                : ''}
            </p>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">لا توجد نتائج</p>
              {query.trim() && (
                <p className="text-xs text-muted-foreground mt-1">
                  جرّب البحث بكلمات مختلفة أو تحقق من الفلاتر
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredOrders.map(order => (
                <div key={order.id} className="relative">
                  {/* Status warning badge for completed/cancelled */}
                  {(order.status === 'cancelled' || order.status === 'delivered') && (
                    <div className={`absolute -top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      order.status === 'cancelled'
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-success text-success-foreground'
                    }`}>
                      {order.status === 'cancelled' ? '⚠ ملغي' : '✓ مكتمل'}
                    </div>
                  )}
                  <div onClick={() => handleOrderClick(order)} className="cursor-pointer">
                    <OrderCard
                      order={order}
                      compact
                      showActions={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Recent Orders quick access */}
      {showQuickAccess && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            آخر الطلبات
          </p>
          <div className="grid gap-2">
            {recentOrders.map(order => (
              <div
                key={order.id}
                onClick={() => handleOrderClick(order)}
                className="cursor-pointer bg-card border border-border rounded-lg p-2.5 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary text-sm">{toEnglishNumbers(order.order_number)}</span>
                    <span className="text-xs text-foreground">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatNumberWithCommas(Number(order.total_price))} د.ع
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        order.status === 'delivered' ? 'text-success border-success/30' :
                        order.status === 'cancelled' ? 'text-destructive border-destructive/30' :
                        order.status === 'ready' ? 'text-success border-success/30' :
                        order.status === 'preparing' ? 'text-info border-info/30' :
                        order.status === 'delivering' ? 'text-primary border-primary/30' :
                        'text-warning border-warning/30'
                      }`}
                    >
                      {order.status === 'pending' ? 'معلق' :
                       order.status === 'preparing' ? 'تحضير' :
                       order.status === 'ready' ? 'جاهز' :
                       order.status === 'delivering' ? 'توصيل' :
                       order.status === 'delivered' ? 'مكتمل' : 'ملغي'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      />
    </div>
  );
}
