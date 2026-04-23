import {
  AlertTriangle,
  ShieldAlert,
  Ban,
  Construction,
  Fuel,
  CloudRain,
  Car,
  Lightbulb,
  Store,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

export interface PostTypeMeta {
  id: string;
  label: string;
  icon: LucideIcon;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  defaultSeverity: string;
}

export const POST_TYPES: PostTypeMeta[] = [
  { id: 'traffic', label: 'ازدحام', icon: AlertTriangle, emoji: '🚧', color: 'text-red-600', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', defaultSeverity: 'warning' },
  { id: 'police', label: 'سيطرة', icon: ShieldAlert, emoji: '👮', color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', defaultSeverity: 'warning' },
  { id: 'closed_road', label: 'طريق مغلق', icon: Ban, emoji: '🚫', color: 'text-red-700', bgColor: 'bg-red-600/10', borderColor: 'border-red-600/30', defaultSeverity: 'critical' },
  { id: 'pothole', label: 'حفرة/طريق سيء', icon: Construction, emoji: '🛣️', color: 'text-orange-600', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', defaultSeverity: 'info' },
  { id: 'accident', label: 'حادث مروري', icon: Car, emoji: '⚠️', color: 'text-red-600', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', defaultSeverity: 'critical' },
  { id: 'weather', label: 'طقس', icon: CloudRain, emoji: '🌧️', color: 'text-slate-600', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', defaultSeverity: 'info' },
  { id: 'fuel', label: 'محطة وقود', icon: Fuel, emoji: '⛽', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', defaultSeverity: 'info' },
  { id: 'closed_shop', label: 'محل مغلق', icon: Store, emoji: '🏪', color: 'text-purple-600', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', defaultSeverity: 'info' },
  { id: 'tip', label: 'نصيحة/طريق بديل', icon: Lightbulb, emoji: '💡', color: 'text-green-600', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', defaultSeverity: 'info' },
  { id: 'general', label: 'عام', icon: MessageCircle, emoji: '💬', color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/30', defaultSeverity: 'info' },
];

export const getPostTypeMeta = (id: string): PostTypeMeta =>
  POST_TYPES.find((t) => t.id === id) || POST_TYPES[POST_TYPES.length - 1];

export const SOS_TYPES = [
  { id: 'car_breakdown', label: 'عطل سيارة', emoji: '🔧' },
  { id: 'accident', label: 'حادث مروري', emoji: '🚨' },
  { id: 'threat', label: 'تهديد/خطر', emoji: '⚠️' },
  { id: 'help_needed', label: 'أحتاج مساعدة', emoji: '🆘' },
  { id: 'other', label: 'أخرى', emoji: '❗' },
];