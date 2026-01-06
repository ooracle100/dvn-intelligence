export function exportToCSV(data, filename) {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function convertToCSV(objArray) {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    if (!array || !array.length) return '';

    const headers = Object.keys(array[0]);
    const csvRows = [];

    // Add Header Row
    csvRows.push(headers.join(','));

    // Add Data Rows
    for (const row of array) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

export function prepareDvnExportData(dvnScores) {
    return dvnScores.map(d => ({
        "DVN Name": d.provider || d.address,
        "Address": d.address,
        "Tier": d.tier,
        "Risk Score": d.score,
        "Success Rate (%)": d.deliveryRate,
        "Total Volume (USD)": d.totalVolume,
        "Total Transactions": d.total,
        "Avg Latency (s)": d.avgLatency,
        "Jurisdiction": d.jurisdiction,
        "Type": d.type,
        "Confidence": d.confidence || 'Medium'
    }));
}
