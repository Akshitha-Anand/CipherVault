import React, { useState, useEffect } from 'react';
import { getEscalatedIncidents } from '../../services/databaseService';
import { VerificationIncident } from '../../types';
import { ShieldAlertIcon } from '../icons';

const EscalatedAlerts: React.FC = () => {
    const [incidents, setIncidents] = useState<VerificationIncident[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIncidents = async () => {
            const data = await getEscalatedIncidents();
            setIncidents(data);
            setLoading(false);
        };
        fetchIncidents();
    }, []);

    return (
        <div className="bg-gray-800/60 border border-red-700/50 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-red-300 mb-4 flex items-center">
                <ShieldAlertIcon className="w-5 h-5 mr-2" />
                Escalated Security Incidents
            </h3>
            {loading ? (
                <p className="text-gray-400">Loading escalated alerts...</p>
            ) : incidents.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No escalated incidents require review.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {incidents.map(incident => (
                        <div key={incident.id} className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700">
                           <img src={incident.capturedImage} alt="Captured attempt" className="w-full h-40 object-cover" />
                           <div className="p-4 text-sm">
                               <p className="font-bold text-white">{incident.userName}</p>
                               <p className="text-xs text-gray-400">User ID: {incident.userId}</p>
                               <p className="text-xs text-gray-400 mt-2">{new Date(incident.timestamp).toLocaleString()}</p>
                           </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EscalatedAlerts;
