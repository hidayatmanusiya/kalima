frappe.ui.form.on("Activity Announcement", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button(__('Fetch From Request'), function () {
                if (frm.doc.activity_request) {
                    frappe.db.get_doc("Activity Request", frm.doc.activity_request)
                        .then(request => {
                            // Set activity_deliverers table
                            if (request.activity_deliverers) {
                                frm.clear_table("activity_deliverers");

                                frappe.model.with_doctype("Activity Deliverers", () => {
                                    let meta = frappe.get_meta("Activity Deliverers");

                                    request.activity_deliverers.forEach(deliverer => {
                                        let new_row = frm.add_child("activity_deliverers");

                                        meta.fields.forEach(field => {
                                            if (deliverer[field.fieldname] !== undefined) {
                                                new_row[field.fieldname] = deliverer[field.fieldname];
                                            }
                                        });
                                    });

                                    frm.refresh_field("activity_deliverers");
                                });
                            }
                            // Set departments table
                            if (request.departments) {
                                frm.clear_table("departments");

                                frappe.model.with_doctype("Activity Departments", () => {
                                    let meta = frappe.get_meta("Activity Departments");

                                    request.departments.forEach(department => {
                                        let new_row = frm.add_child("departments");

                                        meta.fields.forEach(field => {
                                            if (department[field.fieldname] !== undefined) {
                                                new_row[field.fieldname] = department[field.fieldname];
                                            }
                                        });
                                    });

                                    frm.refresh_field("departments");
                                });
                            }
                        });
                }
            }).addClass('bg-success', 'text-white').css({
                "color": "white",
            });
        }



    },
    async activity_request(frm) {
        frm.clear_table('activity_deliverers');

        var req = await frappe.db.get_doc("Activity Request",frm.doc.activity_request);
        req.activity_deliverers.forEach(element => {
            var new_row = frm.add_child('activity_deliverers', {
                'speaker': element.speaker
            });

            
        });
        frm.refresh_field('activity_deliverers');

    }
});
