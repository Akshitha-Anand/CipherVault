import React, { useState, useEffect } from 'react';
import databaseService from '../../services/databaseService';
import { AlertTriangleIcon } from '../icons';

interface Hotspot {
    location: string;
    count: number;
}

const RiskHotspots: React.FC = () => {
    const [hotspots, setHotspots] = useState<Hotspot[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const calculateHotspots = async () => {
            try {
                const sortedHotspots = await databaseService.getRiskHotspots();
                setHotspots(sortedHotspots.slice(0, 5)); // Top 5
            } catch (error) {
                console.error("Failed to fetch risk hotspots:", error);
            }
            setLoading(false);
        };
        calculateHotspots();
    }, []);

    return (
         <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center">
                <AlertTriangleIcon className="w-5 h-5 mr-2 text-orange-400" />
                Geographical Risk Hotspots
            </h3>
            {loading ? (
                 <div className="text-gray-400">Analyzing locations...</div>
            ) : hotspots.length === 0 ? (
                <div className="text-gray-400 text-center py-4">No significant high-risk locations found.</div>
            ) : (
                <ul className="space-y-3">
                    {hotspots.map((hotspot, index) => (
                        <li key={index} className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-gray-200">{hotspot.location}</span>
                            <span className="text-red-400 font-mono bg-red-900/20 px-2 py-0.5 rounded-md text-xs">{hotspot.count} incidents</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default RiskHotspots;
