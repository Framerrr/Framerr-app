import React from 'react';
import ReactDOM from 'react-dom';
import { X, Star, Calendar, Building2, Users } from 'lucide-react';

const MediaInfoModal = ({ session, url, token, onClose }) => {
    if (!session) return null;

    const { Media, Role, Genre, Director, Writer, title, grandparentTitle, type } = session;
    const displayTitle = type === 'episode' ? grandparentTitle || title : title;
    const subtitle = type === 'episode' && session.parentIndex && session.index
        ? `Season ${session.parentIndex} • Episode ${session.index}`
        : null;

    // Build poster image URL
    const posterUrl = session.thumb
        ? `/api/plex/image?path=${encodeURIComponent(session.thumb)}&url=${encodeURIComponent(url)}&token=${encodeURIComponent(token)}`
        : null;

    return ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
                overflowY: 'auto'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '700px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                        Media Info
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '6px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {/* Poster and Basic Info */}
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Poster */}
                        {posterUrl && (
                            <div style={{
                                width: '150px',
                                flexShrink: 0,
                                borderRadius: '8px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}>
                                <img
                                    src={posterUrl}
                                    alt={displayTitle}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block'
                                    }}
                                />
                            </div>
                        )}

                        {/* Title and Metadata */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h2 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: '1.5rem',
                                fontWeight: 700
                            }}>
                                {displayTitle || 'Unknown Title'}
                            </h2>
                            {subtitle && (
                                <p style={{
                                    margin: '0 0 0.75rem 0',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.95rem'
                                }}>
                                    {subtitle}
                                </p>
                            )}
                            {type === 'episode' && title && (
                                <p style={{
                                    margin: '0 0 0.75rem 0',
                                    fontSize: '1.1rem',
                                    fontWeight: 500
                                }}>
                                    {title}
                                </p>
                            )}

                            {/* Metadata Row */}
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '1rem',
                                marginTop: '0.75rem',
                                fontSize: '0.9rem'
                            }}>
                                {Media?.year && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                                        <span>{Media.year}</span>
                                    </div>
                                )}
                                {Media?.rating && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Star size={14} style={{ color: '#f59e0b' }} />
                                        <span>{Media.rating}/10</span>
                                    </div>
                                )}
                                {Media?.contentRating && (
                                    <div style={{
                                        padding: '0.125rem 0.5rem',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}>
                                        {Media.contentRating}
                                    </div>
                                )}
                            </div>

                            {/* Studio */}
                            {Media?.studio && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginTop: '0.75rem',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <Building2 size={14} />
                                    <span>{Media.studio}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Synopsis */}
                    {Media?.summary && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--text-secondary)'
                            }}>
                                Synopsis
                            </h4>
                            <p style={{
                                margin: 0,
                                lineHeight: 1.6,
                                color: 'var(--text-primary)',
                                fontSize: '0.95rem'
                            }}>
                                {Media.summary}
                            </p>
                        </div>
                    )}

                    {/* Genres */}
                    {Genre && Genre.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--text-secondary)'
                            }}>
                                Genres
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {Genre.map((genre, idx) => (
                                    <span
                                        key={idx}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            background: 'rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Directors */}
                    {Director && Director.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--text-secondary)'
                            }}>
                                Director{Director.length > 1 ? 's' : ''}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem' }}>
                                {Director.join(', ')}
                            </p>
                        </div>
                    )}

                    {/* Writers */}
                    {Writer && Writer.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--text-secondary)'
                            }}>
                                Writer{Writer.length > 1 ? 's' : ''}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem' }}>
                                {Writer.join(', ')}
                            </p>
                        </div>
                    )}

                    {/* Cast - Text Only */}
                    {Role && Role.length > 0 && (
                        <div>
                            <h4 style={{
                                margin: '0 0 0.75rem 0',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Users size={14} />
                                Cast
                            </h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '0.5rem'
                            }}>
                                {Role.slice(0, 12).map((actor, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: '0.5rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '6px'
                                        }}
                                    >
                                        <div style={{
                                            fontWeight: 500,
                                            fontSize: '0.9rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {actor.tag}
                                        </div>
                                        {actor.role && (
                                            <div style={{
                                                fontSize: '0.8rem',
                                                color: 'var(--text-secondary)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                marginTop: '0.125rem'
                                            }}>
                                                {actor.role}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {Role.length > 12 && (
                                <p style={{
                                    marginTop: '0.75rem',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    fontStyle: 'italic'
                                }}>
                                    +{Role.length - 12} more cast members
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MediaInfoModal;
