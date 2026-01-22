import { useState, useEffect } from 'react';
import { useAIInsights, AIInsight } from '@/hooks/useAIInsights';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTimeEnglish, toEnglishNumbers } from '@/lib/formatNumber';
import { 
  Brain, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
  History,
  ChevronLeft
} from 'lucide-react';

export function AIInsights() {
  const {
    isLoading,
    error,
    currentInsight,
    insightHistory,
    requestAnalysis,
    fetchHistory,
    fetchLatestInsight,
    fetchInsightById,
    setCurrentInsight
  } = useAIInsights();

  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestInsight();
    fetchHistory();
  }, [fetchLatestInsight, fetchHistory]);

  const handleAnalyze = async () => {
    await requestAnalysis('comprehensive');
    fetchHistory();
  };

  const handleViewHistoryItem = async (id: string) => {
    setSelectedHistoryId(id);
    await fetchInsightById(id);
    setActiveTab('current');
  };

  const handleBackToLatest = async () => {
    setSelectedHistoryId(null);
    await fetchLatestInsight();
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-success bg-success/10 border-success/30';
      case 'B': return 'text-primary bg-primary/10 border-primary/30';
      case 'C': return 'text-warning bg-warning/10 border-warning/30';
      case 'D': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'F': return 'text-destructive bg-destructive/10 border-destructive/30';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'low': return 'bg-success/10 text-success border-success/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      case 'info': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'فوري';
      case 'soon': return 'قريباً';
      case 'later': return 'لاحقاً';
      default: return urgency;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Analyze Button */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                المحلل الذكي
                <Sparkles className="w-4 h-4 text-primary" />
              </h2>
              <p className="text-sm text-muted-foreground">تحليل شامل بالذكاء الاصطناعي</p>
            </div>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحليل...
              </>
            ) : (
              <>
                <RefreshCcw className="w-4 h-4" />
                تحليل جديد
              </>
            )}
          </Button>
        </div>

        {selectedHistoryId && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToLatest}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            العودة لآخر تحليل
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'current' | 'history')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current" className="gap-2">
            <Brain className="w-4 h-4" />
            التحليل الحالي
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            السجل ({toEnglishNumbers(insightHistory.length)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">جاري تحليل البيانات بالذكاء الاصطناعي...</p>
              <p className="text-xs text-muted-foreground mt-1">قد يستغرق هذا بضع ثوان</p>
            </div>
          ) : currentInsight ? (
            <>
              {/* Score Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">النتيجة</p>
                  <p className="text-4xl font-bold text-primary">
                    {toEnglishNumbers(currentInsight.overall_score || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">من 100</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">التصنيف</p>
                  <div className={`text-4xl font-bold inline-block px-4 py-1 rounded-lg border ${getGradeColor(currentInsight.performance_grade || 'N')}`}>
                    {currentInsight.performance_grade || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  الملخص التنفيذي
                </h3>
                <p className="text-muted-foreground leading-relaxed">{currentInsight.summary}</p>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeEnglish(currentInsight.created_at)}
                </p>
              </div>

              {/* Warnings */}
              {currentInsight.warnings && currentInsight.warnings.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    تحذيرات ({toEnglishNumbers(currentInsight.warnings.length)})
                  </h3>
                  <div className="space-y-2">
                    {currentInsight.warnings.map((warning, idx) => (
                      <div key={idx} className="bg-card rounded-lg p-3 border border-destructive/20">
                        <div className="flex items-start gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(warning.severity)}`}>
                            {warning.severity === 'critical' ? 'حرج' : warning.severity === 'warning' ? 'تحذير' : 'معلومة'}
                          </span>
                          <div>
                            <p className="font-medium">{warning.title}</p>
                            <p className="text-sm text-muted-foreground">{warning.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {currentInsight.insights && currentInsight.insights.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-warning" />
                    الرؤى المهمة ({toEnglishNumbers(currentInsight.insights.length)})
                  </h3>
                  <div className="space-y-2">
                    {currentInsight.insights.map((insight, idx) => (
                      <div key={idx} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium">{insight.title}</p>
                          <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(insight.priority)}`}>
                            {insight.priority === 'high' ? 'مهم' : insight.priority === 'medium' ? 'متوسط' : 'منخفض'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {currentInsight.recommendations && currentInsight.recommendations.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    التوصيات ({toEnglishNumbers(currentInsight.recommendations.length)})
                  </h3>
                  <div className="space-y-2">
                    {currentInsight.recommendations.map((rec, idx) => (
                      <div key={idx} className="bg-success/5 border border-success/20 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-success">{rec.title}</p>
                          <span className="px-2 py-0.5 rounded text-xs bg-success/10 text-success border border-success/30">
                            {getUrgencyLabel(rec.urgency)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{rec.action}</p>
                        <p className="text-xs text-success/80">التأثير: {rec.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Opportunities */}
              {currentInsight.opportunities && currentInsight.opportunities.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    الفرص ({toEnglishNumbers(currentInsight.opportunities.length)})
                  </h3>
                  <div className="space-y-2">
                    {currentInsight.opportunities.map((opp, idx) => (
                      <div key={idx} className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-primary">{opp.title}</p>
                          <span className={`px-2 py-0.5 rounded text-xs ${opp.potential === 'high' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {opp.potential === 'high' ? 'إمكانية عالية' : 'إمكانية متوسطة'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{opp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">لا يوجد تحليل حالي</p>
              <p className="text-sm text-muted-foreground">اضغط على "تحليل جديد" للحصول على تحليل شامل</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {insightHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">لا يوجد سجل تحليلات</p>
            </div>
          ) : (
            insightHistory.map((insight) => (
              <div 
                key={insight.id}
                onClick={() => handleViewHistoryItem(insight.id)}
                className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:shadow-elevated ${
                  selectedHistoryId === insight.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border ${getGradeColor(insight.performance_grade)}`}>
                      {insight.performance_grade || 'N'}
                    </div>
                    <div>
                      <p className="font-medium">تحليل شامل</p>
                      <p className="text-xs text-muted-foreground">{formatTimeEnglish(insight.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-primary">{toEnglishNumbers(insight.overall_score || 0)}</p>
                    <p className="text-xs text-muted-foreground">نقطة</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{insight.summary}</p>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
