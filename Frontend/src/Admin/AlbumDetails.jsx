import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Image as ImageIcon, Pencil, Package, Tag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const getImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return '';

  const normalizedPath = String(imagePath).trim();
  if (/^https?:\/\//i.test(normalizedPath)) return encodeURI(normalizedPath);
  if (/^data:/i.test(normalizedPath)) return normalizedPath;

  const cleanPath = normalizedPath.replace(/\\/g, '/');
  const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
  const baseUrl = rawApiUrl.replace(/\/api\/?$/, '');
  const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  return encodeURI(`${baseUrl}${finalPath}`);
};

const readArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const detailItems = [
  ['Album Type', 'album_type'],
  ['Occasion', 'occasion'],
  ['Theme', 'theme'],
  ['Size', 'size'],
  ['Orientation', 'orientation'],
  ['Sheet Count', 'sheet_count'],
  ['Total Pages', 'total_pages'],
  ['Customer Photo Limit', 'photo_limit'],
  ['Cover Type', 'cover_type'],
  ['Cover Material', 'cover_material'],
  ['Cover Finish', 'cover_finish'],
  ['Cover Color', 'cover_color'],
  ['Printing Type', 'printing_type'],
  ['Print Quality', 'print_quality'],
  ['Printing Sides', 'printing_sides'],
  ['Binding Type', 'binding_type'],
];

const listStringFromValue = (value) => {
  if (Array.isArray(value)) return value.map((entry) => typeof entry === 'string' ? entry : (entry?.name || entry?.size || entry?.label || entry?.color || JSON.stringify(entry))).join(', ');
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return 'Not specified';
};

const AlbumDetails = () => {
  const navigate = useNavigate();
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const response = await api.get(`/albums/${albumId}`);
        setAlbum(response?.data?.data || null);
      } catch (requestError) {
        console.error('Failed to load album:', requestError);
        setError(requestError?.response?.data?.message || 'Unable to load album details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f2f3f0] text-sm text-[#5d5d5d]">Loading album...</div>;
  }

  if (error || !album) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f2f3f0] text-sm text-[#b42318]">
        <span>{error || 'Album not found.'}</span>
        <button type="button" onClick={() => navigate('/admin/albums')} className="rounded-xl bg-[#1a3c36] px-4 py-2 font-medium text-white">Back to Albums</button>
      </div>
    );
  }

  const topLevelImages = [album.thumbnail_image, ...readArray(album.product_images)].filter(Boolean);
  const variantImages = readArray(album.variants).flatMap((variant) => {
    const variantImageList = Array.isArray(variant?.images) ? variant.images : [];
    const fallbackImage = variant?.image || '';
    return [fallbackImage, ...variantImageList].filter(Boolean);
  });
  const images = Array.from(new Set([...topLevelImages, ...variantImages])).map(getImageUrl).filter(Boolean);
  const status = album.status || 'Active';
  const stock = Number(album.stock_quantity || 0);
  const sizeOptions = readArray(album.size_options);
  const colorOptions = readArray(album.color_options);
  const variantRows = readArray(album.variants);

  return (
    <div className="min-h-screen bg-[#f2f3f0] p-4 md:p-6">
      <div className="mx-auto max-w-[1250px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button type="button" onClick={() => navigate('/admin/albums')} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#49645e] hover:text-[#1a3c36]">
              <ArrowLeft className="h-4 w-4" /> Back to Albums
            </button>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]">Album Details</h1>
            <p className="mt-2 text-[13px] text-[#646464]">Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span> Albums <span className="mx-2 text-[#9a9a9a]">&gt;</span> {album.product_name}</p>
          </div>
          <button type="button" onClick={() => navigate(`/admin/albums/add?edit=${albumId}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] hover:bg-[#214a42]">
            <Pencil className="h-4 w-4" /> Edit Album
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-[18px] border border-[#e7e0d8] bg-white p-5 shadow-sm">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[#f6f3ef]">
              {images[0] ? <img src={images[0]} alt={album.product_name} className="h-full w-full object-cover" /> : <ImageIcon className="h-16 w-16 text-[#c1b8ad]" />}
            </div>
            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.slice(0, 8).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${album.product_name} ${index + 1}`} className="aspect-square rounded-xl border border-[#e7e0d8] object-cover" />)}
              </div>
            )}
          </section>

          <section className="rounded-[18px] border border-[#e7e0d8] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ece9e5] pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7a7a7a]">{album.product_code || album.product_id}</p>
                <h2 className="mt-2 text-2xl font-bold text-[#1f1d1b]">{album.product_name}</h2>
                <p className="mt-2 text-sm text-[#666]">{album.short_description || 'No short description available.'}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 'Active' ? 'bg-[#dff7ef] text-[#1b7f57]' : 'bg-[#ffe5e5] text-[#d14d4d]'}`}>{status}</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#f7f4ef] p-3"><Tag className="h-4 w-4 text-[#a05c2a]" /><p className="mt-2 text-xs text-[#777]">Category</p><p className="font-semibold text-[#262626]">{album.category || 'General'}</p></div>
              <div className="rounded-xl bg-[#f1f6f4] p-3"><Package className="h-4 w-4 text-[#28745a]" /><p className="mt-2 text-xs text-[#777]">Stock</p><p className="font-semibold text-[#262626]">{stock}</p></div>
              <div className="rounded-xl bg-[#f2f4fa] p-3"><CalendarDays className="h-4 w-4 text-[#526a9e]" /><p className="mt-2 text-xs text-[#777]">Delivery</p><p className="font-semibold text-[#262626]">{album.estimated_delivery_days || 0} days</p></div>
            </div>

            <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {detailItems.map(([label, key]) => {
                const sheetVal = Number(album.sheet_count) || Math.round(Number(album.total_pages || 40) / 2) || 20;
                let displayVal = album[key];
                if (key === 'photo_limit') {
                  displayVal = `${sheetVal * 2} photos max (2 per sheet)`;
                } else if (key === 'sheet_count') {
                  displayVal = `${album.sheet_count ?? sheetVal} Sheets`;
                } else if (key === 'total_pages') {
                  displayVal = `${album.total_pages ?? (sheetVal * 2)} Pages`;
                }
                return (
                  <div key={key} className="border-b border-[#f0efec] pb-3">
                    <p className="text-xs text-[#777]">{label}</p>
                    <p className="mt-1 text-sm font-medium text-[#282828]">{displayVal ?? 'Not specified'}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[18px] border border-[#e7e0d8] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1f1d1b]">Description</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#5f5f5f]">{album.description || 'No description available.'}</p>
        </section>

        <section className="mt-6 rounded-[18px] border border-[#e7e0d8] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#1f1d1b]">Album Structure Details</h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#7a7a7a]">size_options · color_options · variants</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#ece7dd] bg-[#faf9f7] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[#202020]">size_options</span>
                <span className="rounded-full bg-[#e8efeb] px-2.5 py-1 text-[11px] font-semibold text-[#1a3c36]">{sizeOptions.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.length ? sizeOptions.map((size, index) => (
                  <span key={`${size}-${index}`} className="rounded-full border border-[#d7ccb0] bg-white px-3 py-1 text-xs font-medium text-[#404040]">{typeof size === 'string' ? size : size?.size || size?.label || JSON.stringify(size)}</span>
                )) : <span className="text-xs text-[#777]">Not specified</span>}
              </div>
            </div>

            <div className="rounded-2xl border border-[#ece7dd] bg-[#faf9f7] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[#202020]">color_options</span>
                <span className="rounded-full bg-[#e8efeb] px-2.5 py-1 text-[11px] font-semibold text-[#1a3c36]">{colorOptions.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorOptions.length ? colorOptions.map((color, index) => {
                  const colorName = typeof color === 'string' ? color : color?.name || color?.color || JSON.stringify(color);
                  const colorCode = typeof color === 'string' ? '' : color?.code || color?.hex || '#d8d8d8';
                  return (
                    <span key={`${colorName}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-[#d7ccb0] bg-white px-2 py-1 text-xs font-medium text-[#404040]">
                      {colorCode ? <span className="h-3 w-3 rounded-full border border-[#e0d9cc]" style={{ backgroundColor: colorCode }} /> : null}
                      {colorName}
                    </span>
                  );
                }) : <span className="text-xs text-[#777]">Not specified</span>}
              </div>
            </div>

            <div className="rounded-2xl border border-[#ece7dd] bg-[#faf9f7] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[#202020]">variants</span>
                <span className="rounded-full bg-[#e8efeb] px-2.5 py-1 text-[11px] font-semibold text-[#1a3c36]">{variantRows.length}</span>
              </div>
              <div className="space-y-2">
                {variantRows.length ? variantRows.map((variant, index) => (
                  <div key={`${variant?.id || variant?.color || variant?.size || index}-${index}`} className="rounded-lg border border-[#e7e0d8] bg-white px-3 py-2 text-[11px] text-[#505050]">
                    <span className="font-semibold text-[#202020]">{variant?.color || 'Color'} / {variant?.size || 'Size'}</span>
                    <span className="ml-2 text-[#777]">stock: {variant?.stock ?? variant?.quantity ?? 0}</span>
                    <span className="block text-[#777]">{variant?.image || variant?.images?.[0] || 'No image'}</span>
                  </div>
                )) : <span className="text-xs text-[#777]">No variant rows</span>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AlbumDetails;
