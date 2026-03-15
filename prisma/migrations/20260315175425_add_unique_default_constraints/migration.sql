
CREATE UNIQUE INDEX one_default_payment_per_supplier 
ON supplier_payment_methods (supplier_id) 
WHERE is_default = true;


CREATE UNIQUE INDEX one_default_address_per_supplier 
ON supplier_addresses (supplier_id) 
WHERE is_default = true;

CREATE UNIQUE INDEX one_primary_contact_per_supplier 
ON supplier_contacts (supplier_id) 
WHERE is_primary = true;