import React, { useState, useEffect, useMemo } from 'react';
import databaseService from '../../services/databaseService';
import { StoredUser, Transaction, EncryptedBankDetails, VerificationIncident, Notification } from '../../types';
import { ShieldCheckIcon } from '../icons';

type Data = StoredUser | Transaction | EncryptedBankDetails | VerificationIncident | Notification;

const formatCell = (value: any): string => {    
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'object') {
        // Truncate long base64 strings in objects/arrays
        const jsonString = JSON.stringify(value, (key, val) => 
            typeof val === 'string' && val.startsWith('data:image') ? `${val.substring(0, 30)}...` : val
        );
        return jsonString;
    }
    if (typeof value === 'string' && value.startsWith('data:image')) {
        return `${value.substring(0, 30)}...`;
    }
    return String(value);
};

interface DataTableProps<T extends Data> {
    title: string;
    data: T[];
    headers: { key: keyof T; label: string }[];
}

const DataTable = <T extends Data>({ title, data, headers }: DataTableProps<T>) => {
    return (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-cyan-300 p-4 border-b border-gray-700">{title} ({data.length} rows)</h3>
            {data.length === 0 ? (
                <p className="p-4 text-gray-400">No data in this table.</p>
            ) : (
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 sticky top-0">
                            <tr>
                                {headers.map(header => (
                                    <th key={String(header.key)} scope="col" className="px-4 py-3 whitespace-nowrap">
                                        {header.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-700/50">
                                    {headers.map(header => (
                                        <td key={`${String(header.key)}-${rowIndex}`} className="px-4 py-2 font-mono text-xs whitespace-nowrap">
                                            <div className="max-w-xs overflow-hidden truncate" title={formatCell(row[header.key])}>
                                                {formatCell(row[header.key])}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const DBInspector: React.FC = () => {
    const [users, setUsers] = useState<StoredUser[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [bankDetails, setBankDetails] = useState<EncryptedBankDetails[]>([]);
    const [incidents, setIncidents] = useState<VerificationIncident[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [
                    usersData,
                    transactionsData,
                    bankDetailsData,
                    incidentsData,
                    notificationsData
                ] = await Promise.all([
                    databaseService.getAllStoredUsers(),
                    databaseService.getAllTransactions(),
                    databaseService.getAllEncryptedBankDetails(),
                    databaseService.getAllVerificationIncidents(),
                    databaseService.getAllNotifications()
                ]);
                setUsers(usersData);
                setTransactions(transactionsData);
                setBankDetails(bankDetailsData);
                setIncidents(incidentsData);
                setNotifications(notificationsData);
            } catch (error) {
                console.error("Failed to fetch database state:", error);
            }
            setLoading(false);
        };
        fetchAllData();
    }, []);
    
    const userHeaders = useMemo(() => [
        { key: 'id', label: 'ID' },
        { key: 'encryptedName', label: 'Name (Encrypted)' },
        { key: 'encryptedEmail', label: 'Email (Encrypted)' },
        { key: 'status', label: 'Status' },
        { key: 'passwordHash', label: 'Password Hash' },
        { key: 'faceReferenceImages', label: 'Face Refs' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'adminNotes', label: 'Admin Notes' },
    ], []) as { key: keyof StoredUser; label: string }[];
    
    const transactionHeaders = useMemo(() => [
        { key: 'id', label: 'ID' },
        { key: 'userId', label: 'User ID' },
        { key: 'userName', label: 'User Name' },
        { key: 'recipient', label: 'Recipient' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' },
        { key: 'riskLevel', label: 'Risk Level' },
        { key: 'riskScore', label: 'Risk Score' },
        { key: 'time', label: 'Time' },
        { key: 'locationName', label: 'Location' },
        { key: 'aiAnalysisLog', label: 'AI Log' },
    ], []) as { key: keyof Transaction; label: string }[];

    const bankDetailsHeaders = useMemo(() => [
        { key: 'userId', label: 'User ID' },
        { key: 'encryptedAccountHolderName', label: 'Holder Name (Encrypted)' },
        { key: 'encryptedAccountNumber', label: 'Account No. (Encrypted)' },
        { key: 'encryptedBankName', label: 'Bank Name (Encrypted)' },
    ], []) as { key: keyof EncryptedBankDetails; label: string }[];
    
    const incidentHeaders = useMemo(() => [
        { key: 'id', label: 'ID' },
        { key: 'userId', label: 'User ID' },
        { key: 'userName', label: 'User Name' },
        { key: 'status', label: 'Status' },
        { key: 'timestamp', label: 'Timestamp' },
        { key: 'capturedImage', label: 'Image' },
    ], []) as { key: keyof VerificationIncident; label: string }[];

    const notificationHeaders = useMemo(() => [
        { key: 'id', label: 'ID' },
        { key: 'userId', label: 'User ID' },
        { key: 'type', label: 'Type' },
        { key: 'message', label: 'Message' },
        { key: 'read', label: 'Read' },
        { key: 'timestamp', label: 'Timestamp' },
    ], []) as { key: keyof Notification; label: string }[];


    if (loading) {
        return <div className="text-center p-8 text-gray-400">Loading database state...</div>;
    }

    return (
        <div className="mb-8 p-6 bg-gray-900/30 border border-gray-700/50 rounded-lg space-y-6 animate-fade-in">
             <div className="text-center">
                <ShieldCheckIcon className="w-8 h-8 mx-auto text-cyan-400 mb-2"/>
                <h2 className="text-2xl font-bold text-cyan-300">Live Database Inspector</h2>
                <p className="text-gray-400 text-sm">A real-time view of the application's in-memory data.</p>
             </div>
            
             <DataTable title="Users Table" data={users} headers={userHeaders} />
             <DataTable title="Transactions Table" data={transactions} headers={transactionHeaders} />
             <DataTable title="Encrypted Bank Details Table" data={bankDetails} headers={bankDetailsHeaders} />
             <DataTable title="Verification Incidents Table" data={incidents} headers={incidentHeaders} />
             <DataTable title="Notifications Table" data={notifications} headers={notificationHeaders} />
        </div>
    );
};

export default DBInspector;