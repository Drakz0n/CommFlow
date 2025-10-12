/**
 * Client management interface for maintaining business relationships.
 * Central hub for adding, editing, and viewing client information with expandable details.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ClientCard from './ClientCard';
import ClientModal from './ClientModal';
import './ClientList.css';
import { useClients } from '../contexts/ClientContext';
import type { Client } from '../contexts/ClientContext';

const ClientList: React.FC = () => {
  const { t } = useTranslation('clients');
  const { clients, addClient, updateClient, deleteClient } = useClients();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteClient = (id: string) => {
    deleteClient(id);
  };

  const handleModalSubmit = (clientData: Omit<Client, 'id' | 'totalCommissions' | 'joinDate'>) => {
    addClient(clientData);
  };

  const handleModalUpdate = (id: string, updates: Partial<Client>) => {
    updateClient(id, updates);
  };

  /**
   * Single-expand behavior keeps UI clean by showing only one client's details at a time.
   * Prevents information overload when browsing through multiple clients.
   */
  const toggleClient = (id: string) => {
    setExpandedClientId(prev => prev === id ? null : id);
  };

  if (clients.length === 0) {
    return (
      <div className="client-list">
        <div className="client-list-content">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            textAlign: 'center',
            color: '#718096'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>👥</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
              {t('empty.noClients')}
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              {t('empty.addFirstClient')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-list">
      <div className="client-list-content">
        {clients.map((client) => (
          <ClientCard 
            key={client.id} 
            client={client} 
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
            isExpanded={expandedClientId === client.id}
            onToggle={() => toggleClient(client.id)}
          />
        ))}
      </div>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        onUpdate={handleModalUpdate}
        client={editingClient}
        mode={modalMode}
      />
    </div>
  );
};

/**
 * Expose add functionality for external components that need to trigger client creation.
 * Useful for workflow shortcuts where context is already focused on a specific task.
 */
export const useAddClientHandler = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  const openAddModal = () => {
    setEditingClient(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  return {
    isModalOpen,
    setIsModalOpen,
    editingClient,
    modalMode,
    openAddModal
  };
};

export default ClientList;
