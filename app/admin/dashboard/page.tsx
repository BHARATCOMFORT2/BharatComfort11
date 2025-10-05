"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Partner {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface Listing {
  id: string;
  title: string;
  ownerId: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, partners: 0, listings: 0, staffs: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);

  // Search, sort, pagination states
  const [userSearch, setUserSearch] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [listingSearch, setListingSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  const [userPage, setUserPage] = useState(1);
  const [partnerPage, setPartnerPage] = useState(1);
  const [listingPage, setListingPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const rowsPerPage = 10;

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      // Users
      const usersSnap = await getDocs(collection(db, "users"));
      const usersData = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as User[];
      setUsers(usersData);

      // Partners
      const partnersSnap = await getDocs(collection(db, "partners"));
      const partnersData = partnersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Partner[];
      setPartners(partnersData);

      // Listings
      const listingsSnap = await getDocs(collection(db, "listings"));
      const listingsData = listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Listing[];
      setListings(listingsData);

      // Staffs
      const staffsSnap = await getDocs(collection(db, "staffs"));
      const staffsData = staffsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Staff[];
      setStaffs(staffsData);

      // Stats
      setStats({
        users: usersData.length,
        partners: partnersData.length,
        listings: listingsData.length,
        staffs: staffsData.length,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Delete functions
  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm("Are you sure?")) return;
    await deleteDoc(doc(db, collectionName, id));
    fetchData();
  };

  // Approve partner
  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, "partners", id), { status: "approved" });
    fetchData();
  };

  // Filtered & Paginated helpers
  const getFilteredPaginated = <T extends { id: string; name?: string; title?: string }>(
    arr: T[],
    search: string,
    page: number
  ) => {
    const filtered = arr.filter(
      (x) =>
        (x.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (x.title?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );
    const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    return { filtered, paginated };
  };

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <header className="flex justify-between mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => auth.signOut().then(() => router.push("/auth/login"))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Logout
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* Sections: Users, Partners, Listings, Staffs */}
      {[
        { title: "Users", data: users, search: userSearch, setSearch: setUserSearch, page: userPage, setPage: setUserPage, isPartner: false },
        { title: "Partners", data: partners, search: partnerSearch, setSearch: setPartnerSearch, page: partnerPage, setPage: setPartnerPage, isPartner: true },
        { title: "Listings", data: listings, search: listingSearch, setSearch: setListingSearch, page: listingPage, setPage: setListingPage, isPartner: false },
        { title: "Staffs", data: staffs, search: staffSearch, setSearch: setStaffSearch, page: staffPage, setPage: setStaffPage, isPartner: false },
      ].map(({ title, data, search, setSearch, page, setPage, isPartner }) => {
        const { filtered, paginated } = getFilteredPaginated(data, search, page);
        return (
          <div key={title} className="mb-12 bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">{title}</h2>
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 p-2 border rounded w-full"
            />
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 border">Name/Title</th>
                  {title !== "Listings" && <th className="py-2 px-4 border">Email</th>}
                  {isPartner && <th className="py-2 px-4 border">Status</th>}
                  <th className="py-2 px-4 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{item.name ?? item.title}</td>
                    {title !== "Listings" && <td className="py-2 px-4">{item.email}</td>}
                    {isPartner && <td className="py-2 px-4">{item.status}</td>}
                    <td className="py-2 px-4 space-x-2">
                      {isPartner && item.status === "pending" && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(isPartner ? "partners" : title.toLowerCase(), item.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="flex justify-between mt-2">
              <button onClick={() => setPage(Math.max(page - 1, 1))} disabled={page === 1} className="px-3 py-1 bg-gray-200 rounded">
                Previous
              </button>
              <span>Page {page} of {Math.ceil(filtered.length / rowsPerPage)}</span>
              <button
                onClick={() => setPage(Math.min(page + 1, Math.ceil(filtered.length / rowsPerPage)))}
                disabled={page === Math.ceil(filtered.length / rowsPerPage)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Next
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
