'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, LogOut, Key, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

interface AccountSettingsProps {
  user: User;
  onSignOut: () => void;
  onClose: () => void;
}

export function AccountSettings({ user, onSignOut, onClose }: AccountSettingsProps) {
  const [firstName, setFirstName] = useState(user.user_metadata?.first_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingName, setChangingName] = useState(false);

  const handleUpdateFirstName = async () => {
    if (!firstName.trim()) {
      toast.error('Podaj imię');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    const { error } = await supabase.auth.updateUser({
      data: { first_name: firstName.trim() }
    });

    setLoading(false);

    if (error) {
      console.error('Error updating name:', error);
      toast.error(`Błąd podczas zmiany imienia: ${error.message}`);
      return;
    }

    toast.success('Imię zostało zaktualizowane');
    setChangingName(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Hasła nie są identyczne');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Najpierw sprawdź czy aktualne hasło jest prawidłowe
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (signInError) {
      setLoading(false);
      toast.error('Błędne aktualne hasło');
      return;
    }

    // Zmień hasło
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);

    if (error) {
      console.error('Error updating password:', error);
      toast.error(`Błąd podczas zmiany hasła: ${error.message}`);
      return;
    }

    toast.success('Hasło zostało zmienione');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangingPassword(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Zarządzanie kontem</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>

        {/* Zmiana imienia */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Imię</Label>
            {!changingName && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChangingName(true)}
              >
                <UserIcon className="h-4 w-4 mr-1" />
                Zmień
              </Button>
            )}
          </div>
          {changingName ? (
            <div className="space-y-2">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Imię"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateFirstName();
                  } else if (e.key === 'Escape') {
                    setChangingName(false);
                    setFirstName(user.user_metadata?.first_name || '');
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateFirstName}
                  disabled={loading}
                  size="sm"
                >
                  Zatwierdź
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setChangingName(false);
                    setFirstName(user.user_metadata?.first_name || '');
                  }}
                  size="sm"
                >
                  Anuluj
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700">
              {user.user_metadata?.first_name || 'Nie ustawiono'}
            </p>
          )}
        </div>

        {/* Zmiana hasła */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Hasło</Label>
            {!changingPassword && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChangingPassword(true)}
              >
                <Key className="h-4 w-4 mr-1" />
                Zmień hasło
              </Button>
            )}
          </div>
          {changingPassword ? (
            <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <div>
                <Label className="text-xs">Aktualne hasło</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Aktualne hasło"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Nowe hasło</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nowe hasło (min. 6 znaków)"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Potwierdź nowe hasło</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Potwierdź nowe hasło"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={loading}
                  size="sm"
                >
                  Zatwierdź
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  size="sm"
                >
                  Anuluj
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700">••••••••</p>
          )}
        </div>

        {/* Wylogowanie */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Wyloguj się
          </Button>
        </div>
      </div>
    </div>
  );
}

