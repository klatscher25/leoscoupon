'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { GoogleVisionCouponAnalyzer, GoogleVisionCouponResult } from '@/utils/googleVisionCouponAnalyzer';

interface Store {
  id: string;
  name: string;
  chain_code: string;
}

interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface EnhancedCouponUploadProps {
  googleVisionApiKey: string;
  onCouponSaved?: (couponId: string) => void;
}

const EnhancedCouponUpload = ({ googleVisionApiKey, onCouponSaved }: EnhancedCouponUploadProps) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GoogleVisionCouponResult | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    store_id: '',
    title: '',
    description: '',
    category: 'artikel' as 'einkauf' | 'warengruppe' | 'artikel',
    product_category_id: '',
    new_category_name: '',
    barcode_type: 'ean13',
    barcode_value: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    value_amount: '',
    value_type: 'points',
    minimum_purchase_amount: '',
    is_combinable: true,
    conditions: '',
    priority: '0'
  });
  
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [combinationRules, setCombinationRules] = useState({
    max_per_transaction: 1,
    incompatible_categories: [] as string[],
    partner_specific_rules: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadStores();
    loadCategories();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, chain_code')
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Stores:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, code, name, description')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
    }
  };

  const createNewCategory = async (name: string): Promise<string | null> => {
    try {
      // Erstelle Code aus Name (lowercase, spaces zu underscores)
      const code = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      
      // Prüfe ob Code bereits existiert
      const existing = categories.find(cat => cat.code === code);
      if (existing) {
        return existing.id;
      }

      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          code,
          name,
          description: `Automatisch erstellt beim Coupon-Upload: ${name}`
        })
        .select()
        .single();

      if (error) throw error;
      
      // Lade Kategorien neu
      await loadCategories();
      
      return data.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Kategorie:', error);
      return null;
    }
  };

  const analyzeImage = async (file: File) => {
    setAnalyzing(true);
    try {
      // Upload Image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('coupons')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('coupons')
        .getPublicUrl(fileName);

      setUploadedImageUrl(publicUrl);

      // Analyze with Google Vision
      const analyzer = new GoogleVisionCouponAnalyzer({
        apiKey: googleVisionApiKey,
        enableDebug: false
      });

      const result = await analyzer.analyzeCouponImage(file);
      setAnalysisResult(result);

      // Auto-fill form with analysis results
      if (result.success && result.extractedData) {
        const data = result.extractedData;
        
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          description: data.description || prev.description,
          barcode_value: data.barcode || prev.barcode_value,
          barcode_type: data.barcodeType || prev.barcode_type,
          valid_until: data.validUntil || prev.valid_until,
          value_amount: data.value?.toString() || prev.value_amount,
          conditions: data.conditions || prev.conditions
        }));

        // Versuche Store zu erraten basierend auf erkanntem Text
        if (data.brand || data.store) {
          const searchTerm = (data.brand || data.store).toLowerCase();
          const matchedStore = stores.find(store => 
            store.name.toLowerCase().includes(searchTerm) ||
            store.chain_code.toLowerCase().includes(searchTerm)
          );
          
          if (matchedStore) {
            setFormData(prev => ({ ...prev, store_id: matchedStore.id }));
          }
        }

        // Automatische Kategorie-Erkennung
        if (data.category) {
          const matchedCategory = categories.find(cat => 
            cat.name.toLowerCase().includes(data.category.toLowerCase()) ||
            cat.code.toLowerCase().includes(data.category.toLowerCase())
          );
          
          if (matchedCategory) {
            setFormData(prev => ({ ...prev, product_category_id: matchedCategory.id }));
          } else {
            // Neue Kategorie vorschlagen
            setFormData(prev => ({ ...prev, new_category_name: data.category }));
            setShowNewCategoryForm(true);
          }
        }
      }

    } catch (error) {
      console.error('Fehler bei der Bildanalyse:', error);
      alert('Fehler bei der Bildanalyse: ' + (error as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const validateCouponData = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.store_id) errors.push('Store muss ausgewählt werden');
    if (!formData.title.trim()) errors.push('Titel ist erforderlich');
    if (!formData.barcode_value.trim()) errors.push('Barcode ist erforderlich');
    if (!formData.valid_until) errors.push('Gültigkeitsdatum ist erforderlich');
    
    if (formData.category === 'warengruppe') {
      if (!formData.product_category_id && !formData.new_category_name.trim()) {
        errors.push('Warengruppe muss ausgewählt oder erstellt werden');
      }
    }
    
    return errors;
  };

  const saveCoupon = async () => {
    const errors = validateCouponData();
    if (errors.length > 0) {
      alert('Validierungsfehler:\n' + errors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      let categoryId = formData.product_category_id;
      
      // Erstelle neue Kategorie falls nötig
      if (!categoryId && formData.new_category_name.trim()) {
        categoryId = await createNewCategory(formData.new_category_name.trim());
        if (!categoryId) {
          alert('Fehler beim Erstellen der neuen Kategorie');
          return;
        }
      }

      // Erstelle Coupon
      const couponData = {
        store_id: formData.store_id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        product_category_id: categoryId || null,
        barcode_type: formData.barcode_type,
        barcode_value: formData.barcode_value.trim(),
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        value_amount: formData.value_amount ? parseFloat(formData.value_amount) : null,
        value_type: formData.value_type,
        minimum_purchase_amount: formData.minimum_purchase_amount ? parseFloat(formData.minimum_purchase_amount) : null,
        is_combinable: formData.is_combinable,
        conditions: formData.conditions.trim() || null,
        priority: parseInt(formData.priority),
        image_url: uploadedImageUrl || null,
        combination_rules: {
          max_per_transaction: combinationRules.max_per_transaction,
          incompatible_categories: combinationRules.incompatible_categories,
          partner_specific_rules: combinationRules.partner_specific_rules || null
        }
      };

      const { data, error } = await supabase
        .from('coupons')
        .insert(couponData)
        .select()
        .single();

      if (error) throw error;

      alert('✅ Coupon erfolgreich gespeichert!');
      
      if (onCouponSaved) {
        onCouponSaved(data.id);
      }

      // Reset form
      resetForm();

    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      store_id: '',
      title: '',
      description: '',
      category: 'artikel',
      product_category_id: '',
      new_category_name: '',
      barcode_type: 'ean13',
      barcode_value: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      value_amount: '',
      value_type: 'points',
      minimum_purchase_amount: '',
      is_combinable: true,
      conditions: '',
      priority: '0'
    });
    setAnalysisResult(null);
    setUploadedImageUrl('');
    setShowNewCategoryForm(false);
    setCombinationRules({
      max_per_transaction: 1,
      incompatible_categories: [],
      partner_specific_rules: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📸 Erweiterte Coupon-Erstellung
        </h3>

        {/* Image Upload */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && analyzeImage(e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {analyzing ? '🔍 Analysiere...' : '📷 Bild hochladen & analysieren'}
            </button>
            
            {uploadedImageUrl && (
              <img 
                src={uploadedImageUrl} 
                alt="Uploaded coupon"
                className="w-16 h-16 object-cover rounded-lg border"
              />
            )}
          </div>
          
          {analysisResult && (
            <div className={`mt-4 p-3 rounded-lg ${
              analysisResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${analysisResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {analysisResult.success ? '✅ Analyse erfolgreich' : '❌ Analyse fehlgeschlagen'}: {analysisResult.message}
              </p>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Store Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store *
            </label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData(prev => ({ ...prev, store_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Store auswählen...</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.chain_code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon-Kategorie *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="einkauf">🛒 Gesamter Einkauf</option>
              <option value="warengruppe">📦 Warengruppe</option>
              <option value="artikel">🏷️ Einzelner Artikel</option>
            </select>
          </div>

          {/* Product Category (only for warengruppe) */}
          {formData.category === 'warengruppe' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warengruppe
              </label>
              <div className="space-y-3">
                <select
                  value={formData.product_category_id}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, product_category_id: e.target.value }));
                    if (e.target.value) setShowNewCategoryForm(false);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Bestehende Warengruppe auswählen...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {showNewCategoryForm ? '🔽' : '➕'} Neue Warengruppe erstellen
                  </button>
                </div>
                
                {showNewCategoryForm && (
                  <input
                    type="text"
                    value={formData.new_category_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, new_category_name: e.target.value }))}
                    placeholder="Name der neuen Warengruppe..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titel *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. 5fach Punkte auf Kaffee"
            />
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon-Wert
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formData.value_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, value_amount: e.target.value }))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="5"
                min="0"
                step="0.01"
              />
              <select
                value={formData.value_type}
                onChange={(e) => setFormData(prev => ({ ...prev, value_type: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="points">Punkte</option>
                <option value="percentage">%</option>
                <option value="euro">€</option>
              </select>
            </div>
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode-Typ
            </label>
            <select
              value={formData.barcode_type}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ean13">EAN-13</option>
              <option value="ean8">EAN-8</option>
              <option value="code128">Code 128</option>
              <option value="code39">Code 39</option>
              <option value="qr">QR Code</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode-Wert *
            </label>
            <input
              type="text"
              value={formData.barcode_value}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode_value: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1234567890123"
            />
          </div>

          {/* Validity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gültig ab
            </label>
            <input
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gültig bis *
            </label>
            <input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Minimum Purchase */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mindestbestellwert (€)
            </label>
            <input
              type="number"
              value={formData.minimum_purchase_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, minimum_purchase_amount: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priorität
            </label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detaillierte Beschreibung des Coupons..."
            />
          </div>

          {/* Conditions */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bedingungen
            </label>
            <textarea
              value={formData.conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Spezielle Bedingungen oder Einschränkungen..."
            />
          </div>

          {/* Combinable Checkbox */}
          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_combinable}
                onChange={(e) => setFormData(prev => ({ ...prev, is_combinable: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Mit anderen Coupons kombinierbar
              </span>
            </label>
          </div>
        </div>

        {/* Advanced Combination Rules */}
        {formData.is_combinable && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">🔗 Erweiterte Kombinationsregeln</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max. pro Transaktion
                </label>
                <input
                  type="number"
                  value={combinationRules.max_per_transaction}
                  onChange={(e) => setCombinationRules(prev => ({ 
                    ...prev, 
                    max_per_transaction: parseInt(e.target.value) || 1 
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner-spezifische Regeln
                </label>
                <input
                  type="text"
                  value={combinationRules.partner_specific_rules}
                  onChange={(e) => setCombinationRules(prev => ({ 
                    ...prev, 
                    partner_specific_rules: e.target.value 
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. Aral: max 1 Kraftstoff-Coupon"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={saveCoupon}
            disabled={saving || analyzing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {saving ? '💾 Speichere...' : '✅ Coupon speichern'}
          </button>
          
          <button
            onClick={resetForm}
            disabled={saving || analyzing}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            🗑️ Zurücksetzen
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCouponUpload;
