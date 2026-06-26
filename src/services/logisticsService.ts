import { CalculatorInput, CalculatorOutput } from "@/types";

export const logisticsService = {
  /**
   * Calculates volumetric shipping and arancel fees standardizing against Hacienda SJO regulations.
   * Leverages real Costa Rican import taxes (DAI, Ley 6946, Selective Consumo, and 13% IVA).
   */
  calculateCosts: (input: CalculatorInput): CalculatorOutput => {
    const EXCHANGE_RATE = 500; // 1 USD = 500 CRC
    
    // 1. Weight transformations
    let actualWeight = Number(input.weight);
    if (input.unit === "kgs") {
      actualWeight = Number((actualWeight * 2.20462).toFixed(2)); // convert to lbs
    }
    
    // Simulate some standard dims based on weight for volumetric calculations
    // Formula: (L * W * H) / 166 (IATA Lbs Standard)
    let length = 10;
    let width = 8;
    let height = 6;
    
    if (actualWeight > 5) {
      length = 15;
      width = 12;
      height = 8;
    }
    if (actualWeight > 15) {
      length = 20;
      width = 18;
      height = 12;
    }
    
    const volumetricWeight = Number(((length * width * height) / 166).toFixed(2));
    const chargeableWeight = Math.max(actualWeight, volumetricWeight);
    
    // 2. Base Freight cost
    // Miami: $4.20 per lb, China: $9.50 per lb, Europe: $8.00 per lb
    let baseRate = 4.20;
    if (input.origin === "china") baseRate = 9.50;
    if (input.origin === "europe") baseRate = 8.00;
    
    const freightFee = Number((chargeableWeight * baseRate).toFixed(2));
    
    // 3. Insurance Fee (2% of value if wantsInsurance is true/undefined, 0 if false)
    const wantsInsurance = input.wantsInsurance !== false;
    const insuranceFee = wantsInsurance ? Number((input.value * 0.02).toFixed(2)) : 0.00;
    
    // 4. Base CIF Value (Cost, Insurance & Freight) -> The official Costa Rican tax basis
    const cifValue = Number((input.value + freightFee + insuranceFee).toFixed(2));
    
    // 5. Real Costa Rican Customs Taxes (Ad-valorem DAI + 13% IVA)
    // - Laptops/Computers: DAI 0%, IVA 13% (Total: 13.00%)
    // - Books: DAI 0%, IVA 1% (Total: 1.00%)
    // - General/Clothing/Shoes: DAI 15%, IVA 13% compounded (Total: 29.95%)
    // - Cosmetics: DAI 36.77%, IVA 13% compounded (Total: 54.55%)
    // - Car parts: DAI 32.10%, IVA 13% compounded (Total: 49.27%)
    let daiRate = 0.15;
    let ivaRate = 0.13;
    
    switch (input.category) {
      case "electronics":
        daiRate = 0.00;
        ivaRate = 0.13;
        break;
      case "books":
        daiRate = 0.00;
        ivaRate = 0.01;
        break;
      case "cosmetics":
        daiRate = 0.3677; // high selective tax
        ivaRate = 0.13;
        break;
      case "carparts":
        daiRate = 0.3210; // selective consumption + DAI
        ivaRate = 0.13;
        break;
      case "general":
      case "clothing":
      case "shoes":
      default:
        daiRate = 0.15; // standard general DAI + Ley 6946
        ivaRate = 0.13;
        break;
    }
    
    // Compute DAI (Ad-valorem import tax)
    const customsDai = Number((cifValue * daiRate).toFixed(2));
    
    // Compute IVA (13% Value Added Tax) -> calculated on top of CIF + DAI
    const customsIva = Number(((cifValue + customsDai) * ivaRate).toFixed(2));
    
    // Total consolidated customs arancel
    const customsTax = Number((customsDai + customsIva).toFixed(2));
    
    // 6. Personal Shopper Fee (5% of FOB purchase value, minimum $5.00)
    const personalShopperFee = input.personalShopper 
      ? Math.max(5.00, Number((input.value * 0.05).toFixed(2)))
      : 0.00;
    
    // 7. Home delivery fee ($5 if selected)
    const deliveryFee = input.delivery ? 5.00 : 0.00;
    
    // 8. Total calculations
    const totalUsd = Number((freightFee + insuranceFee + customsTax + deliveryFee + personalShopperFee).toFixed(2));
    const totalCrc = Number((totalUsd * EXCHANGE_RATE).toFixed(2));
    
    return {
      actualWeight,
      volumetricWeight,
      chargeableWeight,
      freightFee,
      cifValue,
      customsDai,
      customsIva,
      customsTax,
      deliveryFee,
      insuranceFee,
      personalShopperFee,
      totalUsd,
      totalCrc
    };
  }
};
