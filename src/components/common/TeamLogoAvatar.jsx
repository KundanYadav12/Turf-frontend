'use client';
import React, { useState, useEffect } from 'react';

/**
 * Team Logo or Fallback Monogram Avatar
 */
export default function TeamLogoAvatar({ logoUrl, teamName = 'Team', size = 52, theme = 'dark' }) {
  const [imgError, setImgError] = useState(!logoUrl);

  useEffect(() => {
    setImgError(!logoUrl);
  }, [logoUrl]);

  const getInitials = (name) => {
    if (!name) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getTeamGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #10b981 0%, #047857 100%)', // Emerald
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Purple
      'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Amber
      'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)', // Red
      'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)', // Cyan
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
      'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'  // Indigo
    ];
    if (!name) return gradients[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  };

  const isNumeric = typeof size === 'number';
  const sizeValue = isNumeric ? `${size}px` : size;
  const borderRadius = isNumeric ? Math.round(size * 0.24) : '12px';

  return (
    <div
      style={{
        width: sizeValue,
        height: sizeValue,
        minWidth: sizeValue,
        minHeight: sizeValue,
        borderRadius: borderRadius,
        background: !imgError && logoUrl
          ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)')
          : getTeamGradient(teamName),
        border: theme === 'dark' ? '1.5px solid rgba(255, 255, 255, 0.16)' : '1.5px solid rgba(0, 0, 0, 0.12)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: !imgError && logoUrl ? (isNumeric ? Math.max(3, Math.round(size * 0.08)) : '4px') : 0,
        overflow: 'hidden',
        flexShrink: 0,
        boxSizing: 'border-box'
      }}
    >
      {!imgError && logoUrl ? (
        <img
          src={logoUrl}
          alt={teamName}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}
        />
      ) : (
        <span
          style={{
            fontWeight: 900,
            fontSize: isNumeric ? Math.max(12, Math.round(size * 0.38)) : 'clamp(0.85rem, 1.2vw, 1.5rem)',
            color: '#ffffff',
            letterSpacing: '0.5px',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
          }}
        >
          {getInitials(teamName)}
        </span>
      )}
    </div>
  );
}
