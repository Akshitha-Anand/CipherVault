import React, { useState, useEffect, useCallback } from 'react';
import { getPendingIncidents, escalateIncident } from '../../services/databaseService';
import { VerificationIncident } from '../../types';
import { ShieldAlertIcon, ChevronUpIcon } from '../icons';

const VerificationAlerts: React.FC = () => {
    const [incidents, setIncidents] = useState<VerificationIncident[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchIncidents = useCallback(async () => {
        const data = await getPendingIncidents();
        setIncidents(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);
    
    const handleEscalate = async (incidentId: string) => {
        await escalateIncident(incidentId);
        fetchIncidents(); // Refresh the list
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-red-700/50 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-red-300 mb-4 flex items-center">
                <ShieldAlertIcon className="w-5 h-5 mr-2" />
                Biometric Verification Failures
            </h3>
            {loading ? (
                <p className="text-gray-400">Loading new alerts...</p>
            ) : incidents.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No pending verification failures.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {incidents.map(incident => (
                        <div key={incident.id} className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700">
                           <img src={incident.capturedImage} alt="Captured attempt" className="w-full h-40 object-cover" />
                           <div className="p-4">
                               <p className="font-bold text-sm text-white">{incident.userName}</p>
                               <p className="text-xs text-gray-400">User ID: {incident.userId} (BLOCKED)</p>
                               <p className="text-xs text-gray-400 mt-1">{new Date(incident.timestamp).toLocaleString()}</p>
                               <button onClick={() => handleEscalate(incident.id)} className="mt-3 w-full px-3 py-1 text-xs font-semibold rounded-md bg-purple-600/50 text-purple-300 hover:bg-purple-600/80 flex items-center justify-center gap-1">
                                    <ChevronUpIcon className="w-4 h-4" /> Forward to Admin
                                </button>
                           </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VerificationAlerts;
