import { createPrismaMock, PrismaMock } from "../helpers/prismaMock";

// currencyConverter imports the server entry point; keep it from booting.
jest.mock("src", () => ({ prisma: {} }));

import CalculateOrderTotals from "@utils/CalculateOrderTotals.util";

const updatedData = (model: { update: jest.Mock }) => {
  const { data } = model.update.mock.calls[0][0];
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)])
  );
};

describe("CalculateOrderTotals", () => {
  let tx: PrismaMock;

  beforeEach(() => {
    tx = createPrismaMock();
  });

  describe("gasPurchaseOrder", () => {
    it("sums line items and applies VAT and regulatory tax", async () => {
      tx.gasPurchaseOrderItem.findMany.mockResolvedValue([
        { unitPrice: "500.50", quantity: 10 },
        { unitPrice: "1000", quantity: 2 },
      ]);
      const order = {
        id: "po-1",
        vatPct: 19.25,
        regulatoryTaxPct: 2,
        currency: "XAF",
      };

      await CalculateOrderTotals.gasPurchaseOrder(order as any, tx as any);

      // subtotal 7005; VAT 19.25% = 1348.4625; tax 2% = 140.1
      expect(updatedData(tx.gasPurchaseOrder)).toEqual({
        subTotal: "7005",
        vatAmount: "1348.4625",
        regulatoryTaxAmt: "140.1",
        total: "8493.5625",
        totalInCfa: "8493.5625",
      });
      expect(tx.exchangeRate.findFirst).not.toHaveBeenCalled();
    });

    it("converts the total to XAF using the latest exchange rate", async () => {
      tx.gasPurchaseOrderItem.findMany.mockResolvedValue([
        { unitPrice: "100", quantity: 1 },
      ]);
      tx.exchangeRate.findFirst.mockResolvedValue({ rate: "655.957" });
      const order = { id: "po-2", vatPct: 0, regulatoryTaxPct: 0, currency: "EUR" };

      await CalculateOrderTotals.gasPurchaseOrder(order as any, tx as any);

      expect(tx.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: { fromCurrency: "EUR", toCurrency: "XAF" },
        orderBy: { effectiveDate: "desc" },
      });
      expect(updatedData(tx.gasPurchaseOrder).totalInCfa).toBe("65595.7");
    });

    it("fails loudly when no exchange rate exists", async () => {
      tx.gasPurchaseOrderItem.findMany.mockResolvedValue([
        { unitPrice: "100", quantity: 1 },
      ]);
      tx.exchangeRate.findFirst.mockResolvedValue(null);
      const order = { id: "po-3", vatPct: 0, regulatoryTaxPct: 0, currency: "USD" };

      await expect(
        CalculateOrderTotals.gasPurchaseOrder(order as any, tx as any)
      ).rejects.toMatchObject({ messageKey: "error.util.exchange_rate_not_found" });
      expect(tx.gasPurchaseOrder.update).not.toHaveBeenCalled();
    });
  });

  it("adds shipping to gas bottle orders", async () => {
    tx.gasBottlePurchaseOrderItem.findMany.mockResolvedValue([
      { unitPrice: "12000", quantity: 5 },
    ]);
    const order = { id: "po-4", vatPct: 10, shippingCost: "2500" };

    await CalculateOrderTotals.gasBottlePurchaseOrder(order as any, tx as any);

    expect(updatedData(tx.gasBottlePurchaseOrder)).toEqual({
      subTotal: "60000",
      vatAmount: "6000",
      total: "68500",
    });
  });

  it("adds freight, customs and insurance to accessory order estimates", async () => {
    tx.accessoryPurchaseOrderItem.findMany.mockResolvedValue([
      { unitPrice: "250", quantity: 4 },
    ]);
    const order = {
      id: "po-5",
      vatPct: 20,
      freightFees: "100",
      customsDuties: "50",
      insuranceAmount: null,
    };

    await CalculateOrderTotals.accessoryPurchaseOrder(order as any, tx as any);

    expect(updatedData(tx.accessoryPurchaseOrder)).toEqual({
      subTotal: "1000",
      vatAmount: "200",
      totalEstimate: "1350",
    });
  });
});
