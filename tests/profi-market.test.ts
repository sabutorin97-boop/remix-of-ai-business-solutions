import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { quoteOrder, bonusDiscount, referralEligible, validReferralCode } from "../src/lib/profi-market-orders";
import { loyaltyTier, rewardBudget } from "../src/lib/profi-market-policy";
describe("market policy", () => {
  it("uses bundle price and rejects incompatible products", () => {
    assert.equal(quoteOrder(["all"]).grossMinor,2490000);
    assert.equal(quoteOrder(["base","photo"]).grossMinor,1480000);
    assert.throws(()=>quoteOrder(["all","base"]));
    assert.throws(()=>quoteOrder(["photo","photo"]));
    assert.throws(()=>quoteOrder(["constructor"]));
  });
  it("does not sell planned items by default",()=>assert.throws(()=>quoteOrder(["reactive-ai"])));
  it("caps bonus discount",()=>assert.equal(bonusDiscount(249000,100000,100000,1000),24900));
  it("rejects self referrals and expired referrals",()=>{
    assert.equal(referralEligible({buyerId:"a",partnerCustomerId:"a",active:true,expiresAt:10,now:1}),false);
    assert.equal(referralEligible({buyerId:"a",partnerCustomerId:"b",active:true,expiresAt:10,now:10}),false);
    assert.equal(validReferralCode("../admin"),null);
  });
  it("checks 300% markup",()=>{
    const input={paid:249000,production:10000,paymentFee:29133,taxReserve:32370,otherCosts:0,requestedBonusBps:200,requestedPartnerBps:500};
    assert.equal(rewardBudget(input).eligible,false);
    assert.equal(rewardBudget({...input,paymentFee:5000,taxReserve:5000}).eligible,true);
  });
  it("uses threshold in kopecks",()=>assert.equal(loyaltyTier(2000000).name,"Gold"));
});
