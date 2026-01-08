import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Send, 
  Loader2,
  Sparkles,
  Trash2,
  User
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ExecutiveChatProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClearMessages: () => void;
}

const ExecutiveChat: React.FC<ExecutiveChatProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearMessages
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!inputMessage.trim() || isLoading) return;
    onSendMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const quickQuestions = [
    'لماذا ارتفعت الإلغاءات اليوم؟',
    'أين أضعف نقطة في هذا الشفت؟',
    'من أكثر دلفري تسبب بمشاكل؟',
    'ما سبب تأخير المطبخ؟'
  ];

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => {
      const isHeader = line.startsWith('##') || line.startsWith('**');
      const isBullet = line.startsWith('-') || line.startsWith('•');
      
      return (
        <p 
          key={i} 
          className={`
            ${isHeader ? 'font-bold text-sm mt-2 mb-1' : ''}
            ${isBullet ? 'pr-3' : ''}
            ${!isHeader && !isBullet ? 'mt-0.5' : ''}
          `}
        >
          {line.replace(/^##\s*/, '').replace(/\*\*/g, '')}
        </p>
      );
    });
  };

  return (
    <Card className="border-2 h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="w-5 h-5 text-primary" />
            أوامر المدير
          </CardTitle>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearMessages}
              className="text-muted-foreground hover:text-destructive h-8 px-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 space-y-3">
        {/* Messages */}
        <ScrollArea 
          className="flex-1 rounded-lg border bg-muted/30 p-3"
          ref={scrollRef}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <Sparkles className="w-10 h-10 mb-3 text-primary/50" />
              <p className="text-center text-sm">
                اسأل أي سؤال عن العمليات
              </p>
              <p className="text-xs mt-1">سأحلل البيانات وأجيب فوراً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-bl-sm'
                        : 'bg-card border shadow-sm rounded-br-sm'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1 mb-1 text-[10px] text-muted-foreground">
                        <Bot className="w-3 h-3" />
                        <span>المساعد</span>
                      </div>
                    )}
                    <div className="text-xs leading-relaxed">
                      {formatMessage(msg.content)}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-card border rounded-xl rounded-br-sm px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">أحلل...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Quick Questions */}
        <div className="flex flex-wrap gap-1.5">
          {quickQuestions.map((q, i) => (
            <Button
              key={i}
              variant="secondary"
              size="sm"
              onClick={() => setInputMessage(q)}
              disabled={isLoading}
              className="text-[10px] h-7 px-2"
            >
              {q}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اسأل سؤالاً..."
            disabled={isLoading}
            className="flex-1 h-9 text-sm"
            dir="rtl"
          />
          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isLoading}
            size="sm"
            className="h-9 w-9 p-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutiveChat;
