import React, { useState, useEffect } from 'react';
import databaseService from '../../services/databaseService';
import { ArrowRightIcon } from '../icons';

interface WorkflowStats {
    initiated: number;
    autoApproved: number;
    needsReview: number;
    finalApproved: number;
    finalBlocked: number;
}

const Node: React.FC<{ title: string; value: number; color: string; }> = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg border-l-4 ${color} bg-gray-900/50`}>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
);

const FlowArrow: React.FC<{ value: number; total: number; label: string; }> = ({ value, total, label }) => {
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
    return (
        <div className="flex flex-col items-center justify-center text-center text-xs text-gray-400 w-24">
            <p>{label}</p>
            <p className="font-bold text-gray-300">{value.toLocaleString()}</p>
            <ArrowRightIcon className="w-8 h-8 my-1 text-gray-500" />
            <p className="font-mono text-cyan-400">{percentage}%</p>
        </div>
    );
}

const WorkflowAnalysisChart: React.FC = () => {
    const [stats, setStats] = useState<WorkflowStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await databaseService.getWorkflowStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch workflow stats:", error);
            }
        };
        fetchStats();
    }, []);

    if (!stats) {
        return <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg h-full flex items-center justify-center"><p>Loading workflow data...</p></div>;
    }

    return (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-lg h-full">
             <h3 className="text-lg font-semibold text-cyan-300 mb-4">
                Transaction Workflow Analysis
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-around space-y-4 md:space-y-0 md:space-x-4">
                {/* Stage 1: Initiated */}
                <Node title="Initiated" value={stats.initiated} color="border-blue-500" />

                <div className="flex flex-col">
                     <FlowArrow value={stats.autoApproved} total={stats.initiated} label="Low Risk" />
                     <div className="h-4"></div>
                     <FlowArrow value={stats.needsReview} total={stats.initiated} label="Needs Review" />
                </div>

                {/* Stage 2: Funnel */}
                 <div className="flex flex-col p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <Node title="AI & User Review" value={stats.needsReview} color="border-yellow-500" />
                 </div>

                <div className="flex flex-col">
                    <FlowArrow value={stats.finalApproved - stats.autoApproved} total={stats.needsReview} label="Approved" />
                    <div className="h-4"></div>
                    <FlowArrow value={stats.finalBlocked} total={stats.needsReview} label="Blocked" />
                </div>

                {/* Stage 3: Outcomes */}
                <div className="flex flex-col space-y-4">
                     <Node title="Final Approved" value={stats.finalApproved} color="border-green-500" />
                     <Node title="Final Blocked" value={stats.finalBlocked} color="border-red-500" />
                </div>
            </div>
        </div>
    );
};

export default WorkflowAnalysisChart;
