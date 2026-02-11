
async function checkApi() {
    try {
        const res = await fetch('http://localhost:5000/marketing/flash-sale/active');
        const data = await res.json();
        console.log('Flash Sale API Response Items:');
        if (data.items) {
            data.items.forEach(item => {
                console.log(`Product: ${item.variant.product.name}`);
                console.log(`Original Price (from API): ${item.variant.price}`);
                console.log(`Sale Price (from API): ${item.salePrice}`);
                const discount = Math.round(((item.variant.price - item.salePrice) / item.variant.price) * 100);
                console.log(`Calculated Discount: ${discount}%`);
                console.log('---');
            });
        } else if (Array.isArray(data)) {
            data.forEach(sale => {
                console.log(`Sale: ${sale.name}`);
                sale.items?.forEach(item => {
                    console.log(`Product: ${item.variant.product.name}`);
                    console.log(`Original Price: ${item.variant.price}`);
                    console.log(`Sale Price: ${item.salePrice}`);
                });
            });
        } else {
            console.log('Unexpected response structure:', data);
        }
    } catch (error) {
        console.error('API Error:', error.message);
    }
}

checkApi();
