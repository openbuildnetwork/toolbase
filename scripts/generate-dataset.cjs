
const fs = require('fs');
const path = require('path');

const TOTAL_ROWS = 50000;
const OUTPUT_FILE = path.join(process.cwd(), 'sales_data_50k.csv');

const regions = ['North', 'South', 'East', 'West', 'Central'];
const products = [
    { name: 'Laptop', category: 'Electronics', price: 1200 },
    { name: 'Mouse', category: 'Electronics', price: 25 },
    { name: 'Keyboard', category: 'Electronics', price: 50 },
    { name: 'Monitor', category: 'Electronics', price: 300 },
    { name: 'Chair', category: 'Furniture', price: 150 },
    { name: 'Desk', category: 'Furniture', price: 400 },
    { name: 'Pen', category: 'Stationery', price: 2 },
    { name: 'Notebook', category: 'Stationery', price: 5 },
];
const statuses = ['Completed', 'Pending', 'Cancelled', 'Returned'];

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

function generateData() {
    console.log(`Generating ${TOTAL_ROWS} rows...`);
    
    const stream = fs.createWriteStream(OUTPUT_FILE);
    
    // Header
    stream.write('transaction_id,date,region,product,category,quantity,unit_price,total_price,status,customer_email\n');

    for (let i = 0; i < TOTAL_ROWS; i++) {
        // 1% chance of duplicate ID to test deduplication
        const id = i < TOTAL_ROWS * 0.01 ? Math.floor(Math.random() * 100) : i + 1000;
        
        const date = randomDate(new Date(2023, 0, 1), new Date(2024, 0, 1));
        const region = regions[Math.floor(Math.random() * regions.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 10) + 1;
        
        // 2% chance of null price to test "Fill Nulls"
        const unitPrice = Math.random() < 0.02 ? '' : (product.price + (Math.random() * 10 - 5)).toFixed(2);
        
        // Calculate total only if price exists
        const totalPrice = unitPrice ? (parseFloat(unitPrice) * quantity).toFixed(2) : '';
        
        // 5% chance of whitespace issues to test "Trim Strings"
        const status = Math.random() < 0.05 ? `  ${statuses[Math.floor(Math.random() * statuses.length)]}  ` : statuses[Math.floor(Math.random() * statuses.length)];

        // 1% missing email
        const email = Math.random() < 0.01 ? '' : `user${id}@example.com`;

        stream.write(`${id},${date},${region},${product.name},${product.category},${quantity},${unitPrice},${totalPrice},"${status}",${email}\n`);
    }

    stream.end();
    console.log(`\nSuccess! Created ${OUTPUT_FILE}`);
    console.log(`Size: ~${(TOTAL_ROWS * 0.1 / 1024).toFixed(2)} MB`);
}

generateData();
