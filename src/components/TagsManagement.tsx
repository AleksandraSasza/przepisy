'use client';

import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Tag } from '@/types/database';

interface TagsManagementProps {
  tags: Tag[];
  userId: string;
  onTagAdded: (tag: Tag) => void;
  onTagDeleted: (tagId: string) => void;
  onClose: () => void;
}

type SortOption = 'alphabetical' | 'date';

export function TagsManagement({
  tags,
  userId,
  onTagAdded,
  onTagDeleted,
  onClose
}: TagsManagementProps) {
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [loading, setLoading] = useState(false);

  const sortedTags = useMemo(() => {
    const sorted = [...tags];
    
    if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    } else if (sortBy === 'date') {
      // Jeśli nie ma created_at, sortujemy po ID (proxies for creation order)
      sorted.sort((a, b) => b.id.localeCompare(a.id));
    }
    
    return sorted;
  }, [tags, sortBy]);

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Podaj nazwę tagu');
      return;
    }

    // Sprawdź czy tag już istnieje
    if (tags.some(t => t.name.toLowerCase().trim() === newTagName.toLowerCase().trim())) {
      toast.error('Tag o tej nazwie już istnieje');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('tags')
      .insert({ user_id: userId, name: newTagName.trim() })
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error('Error adding tag:', error);
      toast.error(`Błąd podczas dodawania tagu: ${error.message}`);
      return;
    }

    if (!data) {
      toast.error('Nie udało się dodać tagu');
      return;
    }

    toast.success(`Tag "${newTagName}" został dodany`);
    onTagAdded(data);
    setNewTagName('');
    setIsAddingTag(false);
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć tag "${tagName}"?`)) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      console.error('Error deleting tag:', error);
      toast.error(`Błąd podczas usuwania tagu: ${error.message}`);
      return;
    }

    toast.success('Tag został usunięty');
    onTagDeleted(tagId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Zarządzanie tagami</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Sortowanie */}
      <div>
        <Label>Sortowanie</Label>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alphabetical">Alfabetycznie (A-Z)</SelectItem>
            <SelectItem value="date">Data dodania (najnowsze)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dodawanie nowego tagu */}
      {isAddingTag ? (
        <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
          <Label className="text-blue-900">Nowy tag</Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nazwa tagu"
              className="bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                } else if (e.key === 'Escape') {
                  setIsAddingTag(false);
                  setNewTagName('');
                }
              }}
            />
            <Button onClick={handleAddTag} disabled={loading}>
              Dodaj
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingTag(false);
                setNewTagName('');
              }}
            >
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsAddingTag(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Dodaj nowy tag
        </Button>
      )}

      {/* Lista tagów */}
      <div className="space-y-2">
        <h3 className="font-semibold">Moje tagi ({sortedTags.length})</h3>
        {sortedTags.length === 0 ? (
          <p className="text-gray-500 text-sm">Nie masz jeszcze żadnych tagów</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <span className="font-medium">{tag.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTag(tag.id, tag.name)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

