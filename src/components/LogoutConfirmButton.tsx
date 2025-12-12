import { useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LogOut } from 'lucide-react';

interface LogoutConfirmButtonProps {
  variant?: 'default' | 'compact';
}

export function LogoutConfirmButton({ variant = 'default' }: LogoutConfirmButtonProps) {
  const { clearRole } = useRole();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    // Clear quick access data if exists
    localStorage.removeItem('adminQuickAccess');
    localStorage.removeItem('adminReturnRole');
    localStorage.removeItem('quickAccessUser');
    
    clearRole();
  };

  if (variant === 'compact') {
    return (
      <>
        <Button 
          variant="destructive" 
          size="lg" 
          className="w-full justify-start h-auto py-4"
          onClick={() => setIsOpen(true)}
        >
          <LogOut className="w-5 h-5 ml-3" />
          <div className="text-right">
            <p className="font-semibold">تسجيل الخروج</p>
            <p className="text-sm text-destructive-foreground/70">العودة لاختيار الدور</p>
          </div>
        </Button>

        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من تسجيل الخروج؟ سيتم العودة لشاشة اختيار الدور.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                تسجيل الخروج
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Button 
        variant="destructive" 
        size="lg" 
        className="w-full justify-start h-auto py-4"
        onClick={() => setIsOpen(true)}
      >
        <LogOut className="w-5 h-5 ml-3" />
        <div className="text-right">
          <p className="font-semibold">تسجيل الخروج</p>
          <p className="text-sm text-destructive-foreground/70">العودة لاختيار الدور</p>
        </div>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من تسجيل الخروج؟ سيتم العودة لشاشة اختيار الدور.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              تسجيل الخروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
