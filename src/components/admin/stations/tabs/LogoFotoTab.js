import { useState } from 'react';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { PhotoIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';

export default function LogoFotoTab({ station }) {
  const [logoFile, setLogoFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [logoPreview, setLogoPreview] = useState(station?.logoUrl || null);
  const [photoPreviews, setPhotoPreviews] = useState(station?.photoUrls || []);
  const [isUploading, setIsUploading] = useState(false);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...photoFiles, ...files];
    setPhotoFiles(newFiles);
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleRemovePhoto = (index) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!station?.id) {
      toast.error('Stazione non valida');
      return;
    }

    setIsUploading(true);
    try {
      const body = {};
      // If user removed logo explicitly
      if (!logoPreview && station?.logoUrl) {
        body.logoDataUrl = null;
      }

      // If user selected a new logo file, logoPreview is a dataURL
      if (logoFile && typeof logoPreview === 'string' && logoPreview.startsWith('data:')) {
        body.logoDataUrl = logoPreview;
      }

      // Add any new photos (only those we have File objects for)
      const newPhotoDataUrls = photoPreviews
        .slice(Math.max(0, (station?.photoUrls || []).length))
        .filter((p) => typeof p === 'string' && p.startsWith('data:'));

      if (newPhotoDataUrls.length > 0) {
        body.photosDataUrls = newPhotoDataUrls;
      }

      // Detect removed existing photos by URL (station.photoUrls contains URLs, photoPreviews may have removed them)
      const existingUrls = Array.isArray(station?.photoUrls) ? station.photoUrls : [];
      const remainingExisting = photoPreviews.filter((p) => typeof p === 'string' && p.startsWith('/'));
      const removePhotoUrls = existingUrls.filter((u) => !remainingExisting.includes(u));
      if (removePhotoUrls.length > 0) {
        body.removePhotoUrls = removePhotoUrls;
      }

      if (Object.keys(body).length === 0) {
        toast('Nessuna modifica da salvare');
        return;
      }

      const resp = await api(`/api/admin/stations/${station.id}/media`, {
        method: 'PUT',
        body,
      });

      if (resp?.errors) {
        Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
        return;
      }

      toast.success('Immagini salvate');
      // Reset local files; keep previews updated to persisted URLs
      setLogoFile(null);
      setPhotoFiles([]);
      setLogoPreview(resp?.data?.logoUrl || null);
      setPhotoPreviews(resp?.data?.photoUrls || []);
    } catch (e) {
      toast.error(e?.message || 'Errore upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <Card.Body>
        <div className="space-y-6">
          {/* Logo Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Logo Stazione
            </h3>
            <div className="space-y-4">
              {logoPreview ? (
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo Stazione"
                      className="w-32 h-32 object-contain border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <PhotoIcon className="w-5 h-5 mr-2" />
                      Cambia Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                      <XMarkIcon className="w-5 h-5 mr-2" />
                      Rimuovi Logo
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <PhotoIcon className="w-5 h-5 mr-2" />
                    Carica Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-sm text-gray-500">
                    Formati supportati: JPG, PNG, GIF. Dimensione massima: 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            {/* Photos Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Foto Stazione
              </h3>
              <div className="space-y-4">
                {/* Photo Grid */}
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-32 object-cover border border-gray-300 rounded-lg"
                        />
                        <button
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Photos Button */}
                <div>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Aggiungi Foto
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-sm text-gray-500">
                    Puoi caricare più foto. Formati supportati: JPG, PNG, GIF. Dimensione massima per foto: 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          {(logoFile || photoFiles.length > 0) && (
            <div className="pt-4 border-t border-gray-200">
              <Button onClick={handleUpload} className="w-full" disabled={isUploading}>
                {isUploading ? 'Salvataggio...' : 'Salva Immagini'}
              </Button>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
