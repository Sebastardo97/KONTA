export const generateInvoiceXML = (invoice: any, company: any, customer: any, items: any[]) => {
    // This is a simplified structure of a UBL 2.1 Invoice for DIAN Colombia
    // In a real scenario, this would be much more complex and strictly typed

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1"
         xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"
         xmlns:xades141="http://uri.etsi.org/01903/v1.4.1#"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-Invoice-2.1.xsd">
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <sts:DianExtensions>
                    <sts:InvoiceControl>
                        <sts:InvoiceAuthorization>${company.resolution_number}</sts:InvoiceAuthorization>
                        <sts:AuthorizationPeriod>
                            <cbc:StartDate>2024-01-01</cbc:StartDate>
                            <cbc:EndDate>2025-01-01</cbc:EndDate>
                        </sts:AuthorizationPeriod>
                        <sts:AuthorizedInvoices>
                            <sts:Prefix>SETT</sts:Prefix>
                            <sts:From>1</sts:From>
                            <sts:To>5000000</sts:To>
                        </sts:AuthorizedInvoices>
                    </sts:InvoiceControl>
                </sts:DianExtensions>
            </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>
    <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>10</cbc:CustomizationID>
    <cbc:ProfileID>DIAN 2.1: Factura Electrónica de Venta</cbc:ProfileID>
    <cbc:ID>${invoice.number}</cbc:ID>
    <cbc:UUID schemeName="CUFE-SHA384">CUFE_PLACEHOLDER</cbc:UUID>
    <cbc:IssueDate>${new Date().toISOString().split('T')[0]}</cbc:IssueDate>
    <cbc:IssueTime>${new Date().toISOString().split('T')[1].split('.')[0]}</cbc:IssueTime>
    <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
    <cbc:Note>Factura generada por KONTA</cbc:Note>
    <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
    
    <!-- Emisor -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyTaxScheme>
                <cbc:RegistrationName>${company.name}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="31" schemeName="31">${company.nit}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>01</cbc:ID>
                    <cbc:Name>IVA</cbc:Name>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>
    
    <!-- Receptor -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyTaxScheme>
                <cbc:RegistrationName>${customer.name}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="13" schemeName="13">${customer.nit_cedula}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>ZZ</cbc:ID>
                    <cbc:Name>No aplica</cbc:Name>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingCustomerParty>
    
    <!-- Totales -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="COP">${invoice.total / 1.19}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="COP">${invoice.total / 1.19}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="COP">${invoice.total}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="COP">${invoice.total}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    
    <!-- Items -->
    ${items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="94">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="COP">${item.total}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Description>${item.name}</cbc:Description>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="COP">${item.unit_price}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>
    `).join('')}
</Invoice>`;

    return xml;
}
